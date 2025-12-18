import React, { useState } from 'react';
import { Infinity, CheckCircle2, XCircle, LoaderCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TodoItem } from './messageParsing';

interface PlanningCardProps {
  todos: TodoItem[];
}

export function PlanningCard({ todos }: PlanningCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const completedCount = todos.filter(t => t.status === 'completed').length;
  const totalCount = todos.length;
  
  if (todos.length === 0) return null;

  return (
    <div className="w-full mb-2 px-1 md:px-0">
      <div className="rounded-xl border border-gray-200/70 bg-white/90 backdrop-blur shadow-sm overflow-hidden">
        {/* Collapsed Header - Always Visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg border border-gray-200 bg-white flex items-center justify-center shadow-sm">
              <Infinity className="w-3 h-3 text-gray-900" />
            </div>
            <span className="text-xs text-gray-600 font-medium">
              {completedCount} de {totalCount} completado
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-0 border-t border-gray-100">
            <div className="space-y-2 mt-3">
              {todos.map((todo, todoIndex) => {
                const StatusIcon =
                  todo.status === 'completed'
                    ? CheckCircle2
                    : todo.status === 'failed'
                      ? XCircle
                      : todo.status === 'in_progress'
                        ? LoaderCircle
                        : null;

                return (
                  <div key={todo.id || todoIndex} className="flex items-start gap-3 rounded-lg px-2.5 py-2 hover:bg-gray-50/70 transition-colors">
                    <div className="flex-shrink-0 pt-[2px]">
                      {StatusIcon ? (
                        <StatusIcon
                          className={cn(
                            "w-4 h-4",
                            todo.status === 'completed' && "text-green-600",
                            todo.status === 'failed' && "text-red-600",
                            todo.status === 'in_progress' && "text-amber-600 animate-spin"
                          )}
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-gray-300 bg-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] md:text-[11px] text-gray-400 tabular-nums pt-[1px]">
                          {todoIndex + 1}.
                        </span>
                        <span
                          className={cn(
                            "block text-xs md:text-sm leading-relaxed",
                            todo.status === 'completed' && "text-gray-500 line-through",
                            todo.status === 'in_progress' && "text-gray-900 font-medium",
                            todo.status === 'pending' && "text-gray-700",
                            todo.status === 'failed' && "text-gray-900 font-medium"
                          )}
                        >
                          {todo.description}
                        </span>
                      </div>

                      {todo.status === 'failed' && todo.errorMessage && (
                        <div className="mt-1 text-[11px] text-red-600/80 leading-snug">
                          {todo.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



