export interface TourStep {
  targetId?: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  image?: string;
}

export interface TourConfig {
  [route: string]: TourStep[];
}

