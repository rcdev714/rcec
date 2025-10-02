// Social platform types for posts, follows, comments, and likes

export type PostVisibility = 'public' | 'followers' | 'private';

export interface Post {
  id: string;
  author_id: string;
  content: string;
  attachments: Attachment[];
  visibility: PostVisibility;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  type: 'image' | 'video' | 'link' | 'document' | 'offering';
  url: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  offering_id?: string; // For offering type attachments
}

export interface PostWithAuthor extends Post {
  author: {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    position: string | null;
    company_name: string | null;
  };
  like_count?: number;
  comment_count?: number;
  is_liked?: boolean;
}

export interface Follow {
  follower_id: string;
  followed_id: string;
  created_at: string;
}

export interface FollowWithProfile {
  follower_id: string;
  followed_id: string;
  created_at: string;
  profile: {
    id: string;
    user_id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    position: string | null;
    company_name: string | null;
  };
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommentWithAuthor extends Comment {
  author: {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export interface PostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PublicProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  avatar_url: string | null;
  position: string | null;
  company_name: string | null;
  is_public_profile: boolean;
  created_at: string;
}

export interface ProfileStats {
  follower_count: number;
  following_count: number;
  post_count: number;
  is_following?: boolean; // if viewing another user's profile
}

// API request/response types

export interface CreatePostRequest {
  content: string;
  attachments?: Attachment[];
  visibility?: PostVisibility;
}

export interface UpdatePostRequest {
  id: string;
  content?: string;
  attachments?: Attachment[];
  visibility?: PostVisibility;
}

export interface CreateCommentRequest {
  post_id: string;
  content: string;
}

export interface FeedRequest {
  page?: number;
  limit?: number;
  visibility?: PostVisibility[];
}

export interface FeedResponse {
  posts: PostWithAuthor[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

// Follow Requests (for private profiles)
export type FollowRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FollowRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: FollowRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface FollowRequestWithProfile extends FollowRequest {
  requester: {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    position: string | null;
    company_name: string | null;
  };
}

// Notifications
export type NotificationType = 
  | 'follow' 
  | 'follow_request' 
  | 'follow_accepted' 
  | 'like' 
  | 'comment' 
  | 'mention';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  post_id: string | null;
  comment_id: string | null;
  follow_request_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationWithDetails extends Notification {
  actor: {
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  post: {
    id: string;
    content: string;
  } | null;
  follow_request: FollowRequestWithProfile | null;
}

