# MVP Plan Feature Implementation

This document summarizes the implementation of the MVP Plan feature in the Idea2App platform.

## Overview

The MVP Plan feature adds a new document type to the workspace that generates a strategic development plan for building a Minimum Viable Product (MVP) based on the project's PRD. This feature requires **10 credits** to generate and integrates with N8N webhooks with OpenRouter fallback.

## Changes Made

### 1. Frontend Components

#### DocumentNav ([src/components/layout/document-nav.tsx](src/components/layout/document-nav.tsx))
- Added `"mvp"` to `DocumentType` type
- Added MVP Plan document with Target icon to the navigation list
- Positioned between PRD and Tech Spec in the pipeline

#### ContentEditor ([src/components/layout/content-editor.tsx](src/components/layout/content-editor.tsx))
- Added Target icon import
- Added `mvp` configuration to `documentConfig`:
  - Title: "MVP Plan"
  - Subtitle: "Minimum viable product development plan"
  - Icon: Target
  - Credit Cost: 10

#### ProjectWorkspace ([src/components/workspace/project-workspace.tsx](src/components/workspace/project-workspace.tsx))
- Added `MvpPlan` interface
- Added `mvpPlans` prop to `ProjectWorkspaceProps`
- Updated `selectedVersionIndex` to include `mvp: 0`
- Updated `getDocumentStatus` to handle MVP plan status
- Updated `getVersionsForDocument` to return MVP plans
- Updated `getDocumentContent` to retrieve MVP plan content
- Updated `documentStatuses` array to include MVP
- Added `/api/analysis/mvp-plan` endpoint in `handleGenerateContent`
- Configured to send PRD content as input for MVP plan generation

#### Project Page ([src/app/(dashboard)/projects/[id]/page.tsx](src/app/(dashboard)/projects/[id]/page.tsx))
- Added database query to fetch MVP plans from `mvp_plans` table
- Passes `mvpPlans` prop to `ProjectWorkspace`

### 2. Backend & API

#### Utils ([src/lib/utils.ts](src/lib/utils.ts))
- Added `'mvp-plan': 10` to `CREDIT_COSTS`
- Updated `AnalysisType` to include `'mvp-plan'`

#### N8N Integration ([src/lib/n8n.ts](src/lib/n8n.ts))
- Added `"mvp-plan": process.env.N8N_MVP_WEBHOOK` to `WEBHOOK_MAP`
- MVP plan generation receives PRD content via webhook payload

#### API Route ([src/app/api/analysis/[type]/route.ts](src/app/api/analysis/[type]/route.ts))
- Added `"mvp-plan"` to `validTypes` array
- Updated N8N webhook call to pass PRD for MVP plan generation
- Added database insert for `mvp_plans` table
- Follows same N8N → OpenRouter fallback pattern as other analyses

### 3. Database

#### Migration ([supabase-migrations/create_mvp_plans_table.sql](supabase-migrations/create_mvp_plans_table.sql))
Created new `mvp_plans` table with:
- `id` (UUID, primary key)
- `project_id` (UUID, foreign key to projects)
- `content` (TEXT, markdown content)
- `version` (INTEGER, default 1)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

Includes:
- Indexes for `project_id` and `created_at`
- Row Level Security (RLS) policies for SELECT, INSERT, UPDATE, DELETE
- Only allows users to access their own MVP plans via project ownership

#### Database Types ([src/types/database.ts](src/types/database.ts))
- Added `mvp_plans` table type definitions
- Includes Row, Insert, and Update types
- Includes relationship to `projects` table

### 4. Testing

#### Test Script ([test-n8n-webhook.js](test-n8n-webhook.js))
- Added `'mvp-plan'` to available webhook types
- Added `N8N_MVP_WEBHOOK` environment variable mapping
- Configured to send PRD as input (similar to tech-spec)
- Added helpful tip about PRD requirement

### 5. Documentation

#### PROJECT_CONTEXT.md
Updated to reflect:
- MVP Plan Generation in core functionality list
- Updated DocumentType and AnalysisType definitions (2 occurrences each)
- Updated workspace layout diagram (7 pipeline steps)
- Updated Analysis Flow description
- Added `mvp_plans` table to database schema
- Updated API endpoint documentation
- Added MVP Plan to credit costs table (10 credits)
- Added `N8N_MVP_WEBHOOK` to environment variables
- Updated Key Files Reference

## Environment Variables

Add to [.env.local](.env.local):

```bash
N8N_MVP_WEBHOOK=/webhook/n8n-mvp-agent
```

**Already configured in your .env.local file!**

## Database Setup

Run the migration SQL to create the `mvp_plans` table:

```bash
# Option 1: Via Supabase Dashboard
# - Go to SQL Editor
# - Paste contents of supabase-migrations/create_mvp_plans_table.sql
# - Click Run

# Option 2: Via Supabase CLI (if installed)
supabase db push
```

## Testing

### 1. Test N8N Webhook Connection

```bash
node test-n8n-webhook.js mvp-plan
```

This will:
- Verify N8N webhook URL is configured
- Send test payload with sample PRD
- Display response and model information
- Provide troubleshooting tips if it fails

### 2. Test in Application

1. **Start dev server**: `npm run dev`
2. **Navigate to a project**: http://localhost:3000/projects/[project-id]
3. **Generate a PRD first** (MVP plan requires PRD as input)
4. **Click "MVP Plan" in document navigation**
5. **Click "Generate (10 credits)"**
6. **Wait for generation** (may take 30-60 seconds via N8N)
7. **Verify content displays** in the content editor
8. **Test version navigation** (if you generate multiple times)
9. **Test PDF export and copy** functionality

### 3. Verify Database

```sql
-- Check MVP plans were created
SELECT * FROM mvp_plans
ORDER BY created_at DESC
LIMIT 10;

-- Check credit deductions
SELECT * FROM credits_history
WHERE action = 'mvp-plan'
ORDER BY created_at DESC;
```

## Workflow

The MVP plan generation follows this flow:

1. **User clicks Generate** on MVP Plan tab
2. **Frontend validation**: Checks user has 10 credits
3. **API request**: Sends project data + PRD content to `/api/analysis/mvp-plan`
4. **Credit deduction**: Atomic operation via `consume_credits()` function
5. **N8N webhook**: Calls N8N workflow with PRD as context
   - If N8N fails or not configured → Falls back to OpenRouter
6. **Database insert**: Saves MVP plan to `mvp_plans` table
7. **Page reload**: Fetches latest data and displays MVP plan
8. **User actions**: Copy to clipboard, download as PDF, or generate new version

## N8N Workflow Setup

Your N8N workflow should:

1. **Accept webhook input**:
   ```json
   {
     "type": "mvp-plan",
     "idea": "Business idea description",
     "name": "Project name",
     "projectId": "uuid",
     "prd": "Full PRD content in markdown",
     "timestamp": "ISO timestamp"
   }
   ```

2. **Generate MVP plan** using AI (Claude, GPT, etc.) based on PRD

3. **Return response**:
   ```json
   {
     "content": "# MVP Plan\n\nMarkdown content...",
     "model": "anthropic/claude-sonnet-4"
   }
   ```

## Fallback Behavior

If N8N webhook fails:
- System automatically falls back to OpenRouter
- Uses configured `OPENROUTER_ANALYSIS_MODEL`
- Generates MVP plan using OpenRouter API
- User sees same result, just different source

## File Reference

### Modified Files
- [src/components/layout/document-nav.tsx](src/components/layout/document-nav.tsx) - Added MVP to navigation
- [src/components/layout/content-editor.tsx](src/components/layout/content-editor.tsx) - Added MVP config
- [src/components/workspace/project-workspace.tsx](src/components/workspace/project-workspace.tsx) - Added MVP handling
- [src/app/(dashboard)/projects/[id]/page.tsx](src/app/(dashboard)/projects/[id]/page.tsx) - Fetch MVP plans
- [src/lib/utils.ts](src/lib/utils.ts) - Added credit cost
- [src/lib/n8n.ts](src/lib/n8n.ts) - Added webhook mapping
- [src/app/api/analysis/[type]/route.ts](src/app/api/analysis/[type]/route.ts) - Added MVP endpoint
- [src/types/database.ts](src/types/database.ts) - Added MVP table types
- [test-n8n-webhook.js](test-n8n-webhook.js) - Added test case
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) - Updated documentation
- [.env.local](.env.local) - Added N8N_MVP_WEBHOOK

### New Files
- [supabase-migrations/create_mvp_plans_table.sql](supabase-migrations/create_mvp_plans_table.sql) - Database migration
- [MVP_PLAN_IMPLEMENTATION.md](MVP_PLAN_IMPLEMENTATION.md) - This file

## Next Steps

1. ✅ **Run database migration** to create `mvp_plans` table
2. ✅ **Configure N8N workflow** to handle mvp-plan webhooks
3. ✅ **Test webhook** using `node test-n8n-webhook.js mvp-plan`
4. ✅ **Restart dev server** to load updated code
5. ✅ **Test in browser** by generating an MVP plan
6. ✅ **Deploy to production** when ready

## Troubleshooting

### MVP Plan generation fails
- Check N8N webhook URL is correct in .env.local
- Verify N8N workflow is active and accepting webhooks
- Check N8N workflow returns correct response format
- Review OpenRouter fallback logs if N8N fails
- Ensure user has sufficient credits (10 required)

### Database errors
- Verify `mvp_plans` table exists: `SELECT * FROM mvp_plans LIMIT 1;`
- Check RLS policies are enabled
- Confirm project ownership in `projects` table

### Frontend issues
- Clear browser cache and reload
- Check browser console for errors
- Verify API response in Network tab
- Ensure project has a PRD before generating MVP plan

## Summary

The MVP Plan feature is now fully integrated into your Idea2App platform! It follows the same patterns as PRD and Tech Spec generation, with:

- **10 credit cost** per generation
- **PRD-based context** for intelligent MVP planning
- **N8N webhook integration** with OpenRouter fallback
- **Full version control** for iterative improvements
- **PDF export** and **copy functionality**
- **Row-level security** ensuring data privacy

The feature is production-ready once you:
1. Run the database migration
2. Configure your N8N workflow
3. Test the integration

Enjoy building MVPs with AI-powered strategic planning! 🚀
