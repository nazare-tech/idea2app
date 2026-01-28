"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { ArrowLeft, Lightbulb } from "lucide-react"
import Link from "next/link"

const categories = [
  { value: "saas", label: "SaaS / Software" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "marketplace", label: "Marketplace" },
  { value: "fintech", label: "Fintech" },
  { value: "healthtech", label: "Healthtech" },
  { value: "edtech", label: "Edtech" },
  { value: "social", label: "Social Media" },
  { value: "other", label: "Other" },
]

export default function NewProjectPage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("saas")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in to create a project")
        return
      }

      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name,
          description,
          category,
          status: "draft",
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      // Create initial system message
      await supabase.from("messages").insert({
        project_id: data.id,
        role: "assistant",
        content: `Welcome to your new project: **${name}**!\n\nI'm here to help you analyze and develop your business idea. Here's what we can do together:\n\n1. **Chat** - Tell me more about your idea and I'll help refine it\n2. **Competitive Analysis** - Understand your market landscape\n3. **Gap Analysis** - Identify opportunities and challenges\n4. **PRD Document** - Create a comprehensive product requirements document\n5. **Technical Spec** - Generate technical specifications\n6. **Generate App** - Deploy a working prototype\n\nLet's start by discussing your idea in more detail. What problem does your business solve?`,
      })

      router.push(`/projects/${data.id}`)
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.3)]">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Create New Project</CardTitle>
              <CardDescription>
                Start by describing your business idea
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 rounded-xl bg-[rgba(255,59,92,0.1)] border border-[rgba(255,59,92,0.2)] text-[#ff6b8a] text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Business Idea"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Describe Your Idea</Label>
              <Textarea
                id="description"
                placeholder="A brief description of your business idea, the problem it solves, and your target audience..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={loading}
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,212,255,0.4)] focus-visible:ring-offset-0 focus-visible:border-[rgba(0,212,255,0.3)] disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200"
                disabled={loading}
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/projects">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
