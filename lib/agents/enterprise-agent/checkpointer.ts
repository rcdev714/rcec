import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple } from "@langchain/langgraph-checkpoint";
import { RunnableConfig } from "@langchain/core/runnables";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase-backed checkpoint saver for LangGraph
 * Persists agent state to Supabase Postgres for conversation continuity
 */
export class SupabaseCheckpointSaver extends BaseCheckpointSaver {
  constructor() {
    super();
  }

  /**
   * Get a checkpoint tuple by thread_id and checkpoint_id
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id as string;
    const checkpointId = config.configurable?.checkpoint_id as string;
    const checkpointNs = config.configurable?.checkpoint_ns as string || '';

    if (!threadId) {
      return undefined;
    }

    try {
      const supabase = await createClient();

      // If no checkpoint_id provided, get the latest
      let query = supabase
        .from('agent_checkpoints')
        .select('*')
        .eq('thread_id', threadId)
        .eq('checkpoint_ns', checkpointNs);

      if (checkpointId) {
        query = query.eq('checkpoint_id', checkpointId);
      } else {
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return undefined;
      }

      // Get checkpoint writes
      const { data: writes, error: writesError } = await supabase
        .from('agent_checkpoint_writes')
        .select('*')
        .eq('thread_id', threadId)
        .eq('checkpoint_ns', checkpointNs)
        .eq('checkpoint_id', data.checkpoint_id)
        .order('idx', { ascending: true });

      if (writesError) {
        console.error('Error fetching checkpoint writes:', writesError);
      }

      // Parse and reconstruct checkpoint
      const checkpoint: Checkpoint = data.state as Checkpoint;
      const metadata: CheckpointMetadata = data.metadata as CheckpointMetadata;

      const pendingWrites = (writes || []).map((write): [string, string, unknown] => [
        write.idx?.toString() || '0',
        write.channel,
        write.value,
      ]);

      return {
        config: {
          configurable: {
            thread_id: data.thread_id,
            checkpoint_ns: data.checkpoint_ns,
            checkpoint_id: data.checkpoint_id,
          },
        },
        checkpoint,
        metadata,
        parentConfig: data.parent_id
          ? {
              configurable: {
                thread_id: data.thread_id,
                checkpoint_ns: data.checkpoint_ns,
                checkpoint_id: data.parent_id,
              },
            }
          : undefined,
        pendingWrites,
      };
    } catch (error) {
      console.error('Error getting checkpoint tuple:', error);
      return undefined;
    }
  }

  /**
   * List checkpoints for a thread
   */
  async *list(
    config: RunnableConfig,
    options?: { limit?: number; before?: RunnableConfig }
  ): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id as string;
    const checkpointNs = config.configurable?.checkpoint_ns as string || '';

    if (!threadId) {
      return;
    }

    try {
      const supabase = await createClient();

      let query = supabase
        .from('agent_checkpoints')
        .select('*')
        .eq('thread_id', threadId)
        .eq('checkpoint_ns', checkpointNs)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.before) {
        const beforeId = options.before.configurable?.checkpoint_id as string;
        if (beforeId) {
          // Get the timestamp of the 'before' checkpoint
          const { data: beforeCheckpoint } = await supabase
            .from('agent_checkpoints')
            .select('created_at')
            .eq('checkpoint_id', beforeId)
            .single();

          if (beforeCheckpoint) {
            query = query.lt('created_at', beforeCheckpoint.created_at);
          }
        }
      }

      const { data: checkpoints, error } = await query;

      if (error) {
        console.error('Error listing checkpoints:', error);
        return;
      }

      for (const data of checkpoints || []) {
        // Get checkpoint writes
        const { data: writes } = await supabase
          .from('agent_checkpoint_writes')
          .select('*')
          .eq('thread_id', threadId)
          .eq('checkpoint_ns', checkpointNs)
          .eq('checkpoint_id', data.checkpoint_id)
          .order('idx', { ascending: true });

        const checkpoint: Checkpoint = data.state as Checkpoint;
        const metadata: CheckpointMetadata = data.metadata as CheckpointMetadata;

        const pendingWrites = (writes || []).map((write): [string, string, unknown] => [
          write.idx?.toString() || '0',
          write.channel,
          write.value,
        ]);

        yield {
          config: {
            configurable: {
              thread_id: data.thread_id,
              checkpoint_ns: data.checkpoint_ns,
              checkpoint_id: data.checkpoint_id,
            },
          },
          checkpoint,
          metadata,
          parentConfig: data.parent_id
            ? {
                configurable: {
                  thread_id: data.thread_id,
                  checkpoint_ns: data.checkpoint_ns,
                  checkpoint_id: data.parent_id,
                },
              }
            : undefined,
          pendingWrites,
        };
      }
    } catch (error) {
      console.error('Error listing checkpoints:', error);
    }
  }

  /**
   * Save a checkpoint
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id as string;
    const checkpointNs = config.configurable?.checkpoint_ns as string || '';
    const checkpointId = checkpoint.id;

    if (!threadId || !checkpointId) {
      throw new Error('thread_id and checkpoint_id are required');
    }

    try {
      const supabase = await createClient();

      // Get parent_id from config
      const parentId = config.configurable?.checkpoint_id as string | undefined;

      // Insert checkpoint
      const { error } = await supabase
        .from('agent_checkpoints')
        .upsert({
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpointId,
          parent_id: parentId || null,
          state: checkpoint as unknown as Record<string, unknown>,
          metadata: metadata as unknown as Record<string, unknown>,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'thread_id,checkpoint_ns,checkpoint_id',
        });

      if (error) {
        console.error('Error saving checkpoint:', error);
        throw error;
      }

      return {
        configurable: {
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpointId,
        },
      };
    } catch (error) {
      console.error('Error putting checkpoint:', error);
      throw error;
    }
  }

  /**
   * Save checkpoint writes (pending updates)
   */
  async putWrites(
    config: RunnableConfig,
    writes: Array<[string, unknown]>,
    _taskId: string
  ): Promise<void> {
    const threadId = config.configurable?.thread_id as string;
    const checkpointNs = config.configurable?.checkpoint_ns as string || '';
    const checkpointId = config.configurable?.checkpoint_id as string;

    if (!threadId || !checkpointId) {
      throw new Error('thread_id and checkpoint_id are required');
    }

    try {
      const supabase = await createClient();

      // Filter out writes with null/undefined values and prepare records
      const writeRecords = writes
        .filter(([_channel, value]) => value !== null && value !== undefined)
        .map(([channel, value], idx) => ({
          thread_id: threadId,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpointId,
          idx,
          channel,
          value: value as unknown,
          created_at: new Date().toISOString(),
        }));

      // Only insert if there are valid writes
      if (writeRecords.length > 0) {
        const { error } = await supabase
          .from('agent_checkpoint_writes')
          .insert(writeRecords);

        if (error) {
          console.error('Error saving checkpoint writes:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error putting writes:', error);
      throw error;
    }
  }

  /**
   * Delete all checkpoints for a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    try {
      const supabase = await createClient();

      // Delete checkpoint writes first (foreign key constraint)
      await supabase
        .from('agent_checkpoint_writes')
        .delete()
        .eq('thread_id', threadId);

      // Delete checkpoints
      await supabase
        .from('agent_checkpoints')
        .delete()
        .eq('thread_id', threadId);
    } catch (error) {
      console.error('Error deleting thread:', error);
      throw error;
    }
  }
}

