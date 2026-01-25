import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Lightbulb,
  BarChart3,
  Search,
  FileText,
  Code,
  Rocket,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Check,
} from "lucide-react"

const features = [
  {
    icon: BarChart3,
    title: "Competitive Analysis",
    description: "Understand your market landscape, identify competitors, and find your competitive edge.",
  },
  {
    icon: Search,
    title: "Gap Analysis",
    description: "Discover untapped opportunities and identify market gaps your idea can fill.",
  },
  {
    icon: FileText,
    title: "PRD Generation",
    description: "Generate comprehensive product requirement documents with user stories and specs.",
  },
  {
    icon: Code,
    title: "Technical Specs",
    description: "Get detailed technical architecture, stack recommendations, and API designs.",
  },
  {
    icon: Rocket,
    title: "App Generation",
    description: "Deploy a working prototype - static sites, SPAs, or progressive web apps.",
  },
  {
    icon: Zap,
    title: "AI-Powered Chat",
    description: "Chat with AI to refine your idea, get insights, and build a stronger business case.",
  },
]

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Get started with basic features",
    credits: "10",
    features: ["10 credits/month", "Basic chat support", "Export to Markdown"],
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$19",
    description: "Perfect for side projects",
    credits: "100",
    features: ["100 credits/month", "Priority chat support", "Export to PDF/DOCX", "1 deployment/month"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    description: "For serious builders",
    credits: "500",
    features: ["500 credits/month", "Priority support", "All export formats", "Unlimited deployments", "Custom domains"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$199",
    description: "For teams and agencies",
    credits: "2,500",
    features: ["2,500 credits/month", "Dedicated support", "All features", "Team collaboration", "API access", "Custom integrations"],
    highlighted: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <span className="text-lg font-bold">Idea2App</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6" variant="secondary">
            AI-Powered Business Idea Platform
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Transform Your
            <span className="text-primary"> Ideas </span>
            Into Reality
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            From business idea to working application. Get competitive analysis, gap analysis, PRD documents, technical specs, and a deployed prototype - all powered by AI.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2 text-base px-8">
                Start Building
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-base px-8">
                Learn More
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
            <div>
              <p className="text-3xl font-bold">5+</p>
              <p className="text-sm text-muted-foreground">Analysis Types</p>
            </div>
            <div>
              <p className="text-3xl font-bold">AI</p>
              <p className="text-sm text-muted-foreground">Powered</p>
            </div>
            <div>
              <p className="text-3xl font-bold">1-Click</p>
              <p className="text-sm text-muted-foreground">Deploy</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4" variant="secondary">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Validate Your Idea
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools to analyze, plan, and build your business idea from concept to deployment.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-all hover:-translate-y-0.5"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4" variant="secondary">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              From Idea to App in Minutes
            </h2>
          </div>
          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Describe Your Idea",
                description: "Create a project and describe your business idea. Chat with AI to refine it.",
                icon: Lightbulb,
              },
              {
                step: "02",
                title: "Get AI-Powered Analysis",
                description: "Generate competitive analysis, gap analysis, PRDs, and technical specifications.",
                icon: BarChart3,
              },
              {
                step: "03",
                title: "Review & Iterate",
                description: "Review the generated documents, chat with AI to refine, and iterate on your idea.",
                icon: FileText,
              },
              {
                step: "04",
                title: "Deploy Your App",
                description: "Choose your app type and let AI generate and deploy a working prototype.",
                icon: Rocket,
              },
            ].map((step) => (
              <div
                key={step.step}
                className="flex items-start gap-6 p-6 rounded-xl border border-border hover:border-primary/50 transition-colors"
              >
                <div className="text-4xl font-bold text-primary/20 shrink-0">{step.step}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                <div className="hidden sm:flex h-12 w-12 rounded-lg bg-primary/10 items-center justify-center shrink-0">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4" variant="secondary">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start for free, upgrade as you grow.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-xl border ${
                  plan.highlighted
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlighted && (
                  <Badge className="mb-4">Most Popular</Badge>
                )}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "$0" && <span className="text-muted-foreground">/mo</span>}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {plan.credits} credits/month
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.price === "$0" ? "Get Started Free" : "Start Free Trial"}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Build Your Next Big Thing?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join builders who are using AI to transform their business ideas into reality.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2 text-base px-8">
              Get Started for Free
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <span className="text-lg font-bold">Idea2App</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <Shield className="h-4 w-4" />
              <span>2026 Idea2App</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
