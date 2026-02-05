# Prompt Tab AI Chat Feature - Setup Guide

## Overview

The Prompt tab features a modern, streamlined AI chat interface that helps users refine their business ideas. The experience is designed to be quick and efficient:

1. **AI asks 4-5 tailored questions** in ONE message based on the type of idea (tool, marketplace, service, etc.)
2. **User answers the questions** in their own words
3. **AI immediately generates a comprehensive summary** (no back-and-forth needed)
4. **Continuous refinement** - users can chat to update their idea, and AI will re-summarize if changes are detected
5. **Modern UI** - Clean, ChatGPT/Claude-style interface with integrated model selection

## Features

- **Modern UI**: Clean, ChatGPT/Claude-style interface with smooth animations and proper color theming
- **AI Model Selection**: Integrated dropdown to choose from multiple AI models (Claude, GPT-4, Gemini, Llama, etc.)
- **Streamlined Flow**: One round of questions → answers → immediate summary (no lengthy back-and-forth)
- **Intelligent Question Strategy**: AI adapts questions based on idea type (tool, marketplace, service, vague)
- **Smart Re-summarization**: Detects when user is refining the idea and automatically updates the summary
- **Configurable System Prompts**: Customize AI behavior via `src/lib/prompt-chat-config.ts`
- **Persistent Conversations**: All chats are saved in the database with full history

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration in your Supabase SQL Editor:

```bash
# File location: migrations/create_prompt_chat_messages.sql
```

**Steps:**
1. Log into your Supabase dashboard
2. Navigate to SQL Editor
3. Copy the contents of `migrations/create_prompt_chat_messages.sql`
4. Paste and run the migration
5. Verify that the `prompt_chat_messages` table is created

### 2. Update Database Types (TypeScript)

Generate updated TypeScript types for the new table:

```bash
npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts
```

Replace `<your-project-id>` with your actual Supabase project ID.

### 3. Verify Environment Variables

Ensure your `.env.local` contains:

```bash
OPENROUTER_API_KEY=sk-or-xxx...
```

No additional environment variables are needed - the feature uses the existing OpenRouter integration.

### 4. Test the Feature

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Create a new project or open an existing one

3. Navigate to the **Prompt** tab

4. You should see the new AI chat interface

5. Click "Start Refining Your Idea" to begin the conversation

## How It Works

### User Flow

1. **Initial Submission**: User creates a project with an initial idea description
2. **Automatic Start**: When the user opens the Prompt tab, the AI automatically greets them and asks 4-5 tailored follow-up questions in ONE message
3. **User Responds**: User answers all the questions in a single message (or multiple messages if preferred)
4. **Immediate Summarization**: AI analyzes the answers and generates a comprehensive summary immediately
5. **Post-Summary Chat**: User can continue chatting to refine the idea:
   - If the message is idea-related → AI provides an updated summary
   - If it's a general question → AI answers but steers back to idea refinement
6. **Integration**: The refined summary updates the project description and is used for generating other documents

### Question Strategy Examples

**For a Tool/Software Product:**
- Who is your target audience?
- What specific problem does this solve?
- What are the key features?
- How is this different from existing solutions?
- What's your business model?

**For a Marketplace:**
- Who are the buyers and sellers?
- What type of transactions occur?
- What's your niche focus?
- What's the value proposition for both sides?
- How will you generate revenue?

**For a Service:**
- How will the service be delivered?
- What's the pricing structure?
- Who benefits and how?
- What's the scope?
- Who are your competitors?

## Customization

### Modifying AI Behavior

Edit `src/lib/prompt-chat-config.ts` to customize:

1. **System Prompt**: Change `PROMPT_CHAT_SYSTEM` to adjust AI personality and question strategy
2. **Summary Format**: Modify `IDEA_SUMMARY_PROMPT` to change summary structure
3. **Available Models**: Add/remove models from `AVAILABLE_MODELS` array
4. **Default Model**: Change `DEFAULT_MODEL` to set a different default

Example:

```typescript
export const PROMPT_CHAT_SYSTEM = `You are a startup advisor...
// Customize the entire system prompt here
`
```

### Credit Cost

Each message in the Prompt chat costs **1 credit** (same as the general chat).

To modify the cost:
1. Edit the API endpoint at `src/app/api/prompt-chat/route.ts`
2. Find the `consume_credits` call
3. Change `p_amount: 1` to your desired cost

## Architecture

### New Components

1. **`PromptChatInterface`** (`src/components/chat/prompt-chat-interface.tsx`)
   - Main chat UI component
   - Model selection dropdown
   - Message rendering with markdown support
   - Auto-scroll and copy functionality

2. **System Prompt Config** (`src/lib/prompt-chat-config.ts`)
   - Configurable system prompts
   - Available AI models list
   - Question strategies

3. **API Endpoint** (`src/app/api/prompt-chat/route.ts`)
   - GET: Fetch conversation history
   - POST: Send messages and get AI responses
   - Handles question flow and summarization logic

### Database Schema

**Table**: `prompt_chat_messages`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `project_id` | UUID | Foreign key to projects table |
| `role` | TEXT | 'user', 'assistant', or 'system' |
| `content` | TEXT | Message content |
| `metadata` | JSONB | Model info, stage, timestamps |
| `created_at` | TIMESTAMP | Message creation time |
| `updated_at` | TIMESTAMP | Last update time |

**Indexes:**
- `idx_prompt_chat_messages_project_id`
- `idx_prompt_chat_messages_created_at`
- `idx_prompt_chat_messages_project_created`

**RLS Policies:**
- Users can only view/modify their own project messages
- Enforced at database level

## Integration with Other Features

### Automatic Summary Usage

When the AI generates a summary (after ~4 message exchanges), it automatically:

1. Updates the project `description` field
2. Makes the summary available for document generation
3. Uses the refined context for:
   - Competitive Analysis
   - PRD Generation
   - MVP Plan
   - Tech Spec

### Document Generation Flow

```
Initial Idea → Prompt Chat (Refinement) → Summary → Competitive Analysis → PRD → MVP Plan → Tech Spec → Deploy
```

The Prompt chat ensures that subsequent document generation has rich, well-defined context.

## Troubleshooting

### Issue: Chat doesn't start automatically

**Solution**: Ensure the project has a `description` field. If it's empty, the chat won't auto-start. Click "Start Refining Your Idea" manually.

### Issue: "Insufficient credits" error

**Solution**: Check that the user has at least 1 credit. Each message costs 1 credit.

### Issue: AI responses are slow

**Solution**:
- Try switching to a faster model (e.g., Gemini 2.0 Flash, GPT-4o)
- Check OpenRouter API status
- Verify your API key has available credits

### Issue: Summary not updating project description

**Solution**: Check the API logs. The summary should trigger after ~8 messages (4 exchanges). If not, the stage detection logic in the API may need adjustment.

### Issue: Database migration fails

**Solution**:
- Ensure you have admin access to Supabase
- Check that the `projects` table exists (it's referenced as a foreign key)
- Run migrations one at a time if needed

## Best Practices

1. **Encourage Users to Be Specific**: The more detail in initial ideas, the better the AI questions
2. **Monitor Credit Usage**: Adjust costs if users are running out too quickly
3. **Customize System Prompt**: Tailor questions to your specific industry or use case
4. **Review Summaries**: Consider adding a manual review step before using summaries for document generation
5. **Test Different Models**: Some models are better at asking questions, others at summarizing

## Future Enhancements

Potential improvements you can make:

1. **Export Conversations**: Add ability to export chat history as PDF/Markdown
2. **Conversation Templates**: Pre-defined question sets for different industries
3. **Multi-language Support**: Detect user language and respond accordingly
4. **Voice Input**: Add speech-to-text for voice-based idea refinement
5. **Collaboration**: Allow multiple team members to contribute to refinement
6. **Analytics**: Track which questions lead to better-defined ideas

## Support

For issues or questions:
- Check the console logs (`npm run dev` output)
- Review Supabase logs in your dashboard
- Verify OpenRouter API usage at https://openrouter.ai/activity

---

**Created**: 2026-02-05
**Version**: 1.0
**Feature**: Prompt Tab AI Chat with Follow-up Questions
