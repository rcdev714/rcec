# Onboarding Videos

This directory contains video files for the onboarding experience.

## Video Files Expected

Upload the following video files to this directory:

### Global Onboarding (First Login)
- `overview.mp4` - Welcome and platform introduction
- `how-it-works.mp4` - How Camella works and key features

### Page-Specific Onboarding
- `dashboard.mp4` - Dashboard tour (plan monitoring, usage stats)
- `chat.mp4` - AI Assistant guide (how to ask questions)
- `companies.mp4` - Company database tour (search, filter, export)
- `offerings.mp4` - Services management guide (create services, targeting)

## Video Specifications

Recommended specifications for best user experience:

- **Format**: MP4 (H.264 codec)
- **Resolution**: 1920x1080 (Full HD) or 1280x720 (HD)
- **Aspect Ratio**: 16:9
- **Duration**: 30-90 seconds per video
- **File Size**: Keep under 10MB per video for fast loading
- **Audio**: Clear narration in Spanish (optional background music)

## Notes

- Videos will display in a responsive player within the onboarding modal
- If a video file is missing, the onboarding will still show with text-only content
- The component automatically handles video loading errors gracefully
- Users can replay videos by clicking the video controls

## Adding New Routes

To add onboarding for a new route:

1. Add video file: `public/onboarding/[route-name].mp4`
2. Update `components/onboarding.tsx`:
   - Add entry to `onboardingContentByRoute` object
   - Include appropriate icon, title, and description

