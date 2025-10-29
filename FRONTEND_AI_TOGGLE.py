"""
================================================================================
FRONTEND UI - AI TOGGLE ADDED
================================================================================

WHAT WAS ADDED:
==============

✅ AI Toggle Switch
  - Location: Above action buttons on project page
  - Default: OFF (use_ai=false - fast mode)
  - Shows real-time status and performance info

✅ Visual Feedback
  - When OFF: "✓ Fast mode: Rule-based image selection (~0.1s/page)"
  - When ON: "⚠️ AI enabled: Slower (~4s/page) but smarter image selection"

✅ Integration
  - Toggle state sent to both API endpoints:
    * /retry_scraping/ (Retry Scraping button)
    * /smart_rescrape_images/ (Smart Update button)

================================================================================
UI COMPONENTS MODIFIED:
================================================================================

1. app/project/[domain]/page.tsx
   - Added `useAI` state (default: false)
   - Updated `handleRetryScraping()` to send use_ai parameter
   - Updated `handleSmartRescrapeImages()` to send use_ai parameter
   - Passed useAI state to ActionButtons component

2. app/components/ActionButtons.tsx
   - Added Switch component from HeroUI
   - Added useAI and setUseAI props
   - Created info box showing current mode
   - Styled with colors: success (off) / warning (on)

================================================================================
USER EXPERIENCE:
================================================================================

Before clicking any button:
1. User sees the AI toggle switch (default: OFF)
2. Sees "Fast mode" message
3. Can toggle to enable AI

When toggling ON:
1. Switch turns on
2. Message changes to "AI enabled: Slower but smarter"
3. Warning color shows it uses API quota

When clicking action buttons:
1. Current AI setting is sent with the request
2. Backend uses appropriate image extraction method
3. Response includes "ai_enabled" field showing what was used

================================================================================
BENEFITS:
================================================================================

✓ User has full control
✓ Default is fast and free (no AI)
✓ Can enable AI when needed for better quality
✓ Clear visual feedback about performance/cost
✓ No need to remember - it's right there on the screen!

================================================================================
TESTING:
================================================================================

To test the frontend changes:
1. cd cartbuddytool-fe
2. npm run dev
3. Navigate to any project page
4. You should see the AI toggle above the action buttons
5. Toggle it on/off and click any scraping button
6. Check network tab to verify use_ai parameter is sent

================================================================================
"""

print(__doc__)
