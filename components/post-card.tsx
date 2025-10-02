"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PostWithAuthor, CommentWithAuthor } from "@/types/social";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import OfferingPreviewCard from "@/components/offering-preview-card";

interface PostCardProps {
  post: PostWithAuthor;
  currentUserId: string;
  currentUserProfile?: {
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onDelete: (postId: string) => void;
}

export default function PostCard({
  post,
  currentUserId,
  currentUserProfile,
  onLike,
  onComment,
  onDelete,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const isOwnPost = post.author_id === currentUserId;

  const authorDisplayName = post.author?.display_name ||
    (post.author?.first_name || post.author?.last_name
      ? `${post.author?.first_name ?? ""} ${post.author?.last_name ?? ""}`.trim()
      : "Usuario");

  const authorAvatarLetter = authorDisplayName.charAt(0).toUpperCase();

  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: es,
  });

  const fetchComments = async () => {
    if (comments.length > 0) {
      setShowComments(!showComments);
      return;
    }

    try {
      setLoadingComments(true);
      const response = await fetch(`/api/comments?post_id=${post.id}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
        setShowComments(true);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) return;

    try {
      setSubmittingComment(true);
      await onComment(post.id, commentContent.trim());
      
      // Add comment to local state with current user's profile
      const newComment: CommentWithAuthor = {
        id: Date.now().toString(), // Temporary ID
        post_id: post.id,
        author_id: currentUserId,
        content: commentContent.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: {
          id: currentUserId,
          display_name: currentUserProfile?.display_name || null,
          first_name: currentUserProfile?.first_name || null,
          last_name: currentUserProfile?.last_name || null,
          avatar_url: currentUserProfile?.avatar_url || null,
        },
      };
      
      setComments([...comments, newComment]);
      setCommentContent("");
    } catch (err) {
      console.error("Error submitting comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Link href={`/profile/${post.author_id}`}>
              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold cursor-pointer hover:opacity-80">
                {post.author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.author.avatar_url}
                    alt={authorDisplayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  authorAvatarLetter
                )}
              </div>
            </Link>
            <div>
              <Link href={`/profile/${post.author_id}`}>
                <p className="font-semibold text-gray-900 hover:underline">
                  {authorDisplayName}
                </p>
              </Link>
              {post.author?.position && (
                <p className="text-xs text-gray-600">
                  {post.author.position}
                  {post.author.company_name ? ` · ${post.author.company_name}` : ""}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
            </div>
          </div>
          {isOwnPost && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(post.id)}
              className="text-gray-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-900 whitespace-pre-wrap mb-4">{post.content}</p>

        {/* Offering Attachments */}
        {post.attachments && post.attachments.length > 0 && (
          <div className="space-y-2">
            {post.attachments.map((attachment, idx) => {
              if (attachment.type === 'offering' && attachment.offering_id) {
                return (
                  <OfferingPreviewCard 
                    key={`${attachment.offering_id}-${idx}`}
                    offeringId={attachment.offering_id}
                  />
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLike(post.id)}
            className={`gap-2 ${post.is_liked ? "text-red-600" : "text-gray-600"}`}
          >
            <Heart
              className="h-4 w-4"
              fill={post.is_liked ? "currentColor" : "none"}
            />
            <span>{post.like_count || 0}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchComments}
            className="gap-2 text-gray-600"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post.comment_count || 0}</span>
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {loadingComments ? (
              <p className="text-sm text-gray-500">Cargando comentarios...</p>
            ) : (
              <>
                {comments.map((comment) => {
                  const commentAuthorName = comment.author?.display_name ||
                    (comment.author?.first_name || comment.author?.last_name
                      ? `${comment.author?.first_name ?? ""} ${comment.author?.last_name ?? ""}`.trim()
                      : "Usuario");
                  const commentAvatarLetter = commentAuthorName.charAt(0).toUpperCase();

                  return (
                    <div key={comment.id} className="flex gap-2">
                      <Link href={`/profile/${comment.author_id}`}>
                        <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-semibold cursor-pointer hover:opacity-80 flex-shrink-0">
                          {comment.author?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={comment.author.avatar_url}
                              alt={commentAuthorName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            commentAvatarLetter
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <Link href={`/profile/${comment.author_id}`}>
                          <p className="font-semibold text-sm hover:underline">
                            {commentAuthorName}
                          </p>
                        </Link>
                        <p className="text-sm text-gray-900 mt-1">{comment.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="Escribe un comentario..."
                    className="flex-1 min-h-[60px] text-sm"
                    maxLength={500}
                  />
                  <Button
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={submittingComment || !commentContent.trim()}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

