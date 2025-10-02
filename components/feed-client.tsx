"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PostWithAuthor, Attachment } from "@/types/social";
import { UserOffering } from "@/types/user-offering";
import PostCard from "@/components/post-card";
import { Loader2, Plus, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FeedClientProps {
  userId: string;
  displayName: string;
  avatarUrl: string | null | undefined;
  userProfile: {
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
  filterByAuthor?: string; // Optional: filter posts by specific author
  showComposer?: boolean; // Optional: show post composer (default true)
}

export default function FeedClient({ 
  userId, 
  displayName, 
  avatarUrl, 
  userProfile,
  filterByAuthor,
  showComposer = true,
}: FeedClientProps) {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [offerings, setOfferings] = useState<UserOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState<UserOffering | null>(null);
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');

  useEffect(() => {
    fetchFeed();
    if (showComposer) {
      fetchOfferings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchOfferings = async () => {
    try {
      const response = await fetch("/api/user-offerings");
      if (response.ok) {
        const data = await response.json();
        setOfferings(data || []);
      }
    } catch (err) {
      console.error("Error fetching offerings:", err);
    }
  };

  const fetchFeed = async () => {
    try {
      setLoading(true);
      // Use posts API with author filter if specified
      // Otherwise use feed API based on active tab
      let url: string;
      if (filterByAuthor) {
        url = `/api/posts?author=${filterByAuthor}&limit=50`;
      } else if (activeTab === 'for-you') {
        url = "/api/feed/for-you?limit=50";
      } else {
        url = "/api/feed?limit=50"; // Following feed
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      } else {
        setError("Error al cargar el feed");
      }
    } catch (err) {
      console.error("Error fetching feed:", err);
      setError("Error al cargar el feed");
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !selectedOffering) return;

    try {
      setPosting(true);
      setError("");
      
      const attachments: Attachment[] = selectedOffering ? [{
        type: 'offering',
        offering_id: selectedOffering.id,
        url: selectedOffering.website_url || '',
        title: selectedOffering.offering_name,
        description: selectedOffering.description || '',
      }] : [];

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim() || `Compartiendo mi servicio: ${selectedOffering?.offering_name}`,
          visibility: "public",
          attachments,
        }),
      });

      if (response.ok) {
        setContent("");
        setSelectedOffering(null);
        // Refresh feed
        await fetchFeed();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error al publicar");
      }
    } catch (err) {
      console.error("Error posting:", err);
      setError("Error al publicar");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the post in state
        setPosts(posts.map(post => {
          if (post.id === postId) {
            const isLiked = data.is_liked;
            return {
              ...post,
              is_liked: isLiked,
              like_count: (post.like_count || 0) + (isLiked ? 1 : -1),
            };
          }
          return post;
        }));
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const handleComment = async (postId: string, commentContent: string) => {
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          content: commentContent,
        }),
      });

      if (response.ok) {
        // Update comment count
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comment_count: (post.comment_count || 0) + 1,
            };
          }
          return post;
        }));
      }
    } catch (err) {
      console.error("Error commenting:", err);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta publicación?")) return;

    try {
      const response = await fetch(`/api/posts?id=${postId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPosts(posts.filter(post => post.id !== postId));
      }
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Tab Switcher - only show if not filtering by author */}
      {!filterByAuthor && (
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('for-you')}
            className={`px-4 py-3 font-semibold transition-colors relative ${
              activeTab === 'for-you'
                ? 'text-black'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Para ti
            {activeTab === 'for-you' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-t"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-4 py-3 font-semibold transition-colors relative ${
              activeTab === 'following'
                ? 'text-black'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Siguiendo
            {activeTab === 'following' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-t"></div>
            )}
          </button>
        </div>
      )}

      {/* Post Composer - conditionally rendered */}
      {showComposer && (
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold flex-shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                avatarLetter
              )}
            </div>
            <div className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="¿Qué estás pensando?"
                className="min-h-[100px] resize-none border-gray-200 focus:border-gray-400"
                maxLength={2000}
              />
              
              {/* Selected Offering Preview */}
              {selectedOffering && (
                <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {selectedOffering.offering_name}
                      </p>
                      {selectedOffering.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {selectedOffering.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedOffering(null)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {content.length}/2000
                  </span>
                  
                  {/* Add Service Button */}
                  {offerings.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <Plus className="h-3 w-3 mr-1" />
                          Servicio
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-w-xs">
                        {offerings.map((offering) => (
                          <DropdownMenuItem
                            key={offering.id}
                            onClick={() => setSelectedOffering(offering)}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{offering.offering_name}</span>
                              {offering.description && (
                                <span className="text-xs text-gray-500 line-clamp-1">
                                  {offering.description}
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                
                <Button
                  onClick={handlePost}
                  disabled={posting || (!content.trim() && !selectedOffering)}
                  className="bg-black hover:bg-gray-800"
                >
                  {posting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    "Publicar"
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No hay publicaciones aún</p>
              {showComposer && (
                <p className="text-sm mt-1">Sé el primero en publicar algo!</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={userId}
                  currentUserProfile={userProfile}
                  onLike={handleLike}
                  onComment={handleComment}
                  onDelete={handleDelete}
                />
              ))}
            </div>
      )}
    </div>
  );
}

