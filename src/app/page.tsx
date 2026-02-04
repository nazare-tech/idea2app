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
  Sparkles,
} from "lucide-react"

const features = [
  {
    icon: BarChart3,
    title: "Competitive Analysis",
    description: "Understand your market landscape, identify competitors, and find your competitive edge.",
    gradient: "from-[#00d4ff] to-[#0ea5e9]",
  },
  {
    icon: Search,
    title: "Gap Analysis",
    description: "Discover untapped opportunities and identify market gaps your idea can fill.",
    gradient: "from-[#7c3aed] to-[#a855f7]",
  },
  {
    icon: FileText,
    title: "PRD Generation",
    description: "Generate comprehensive product requirement documents with user stories and specs.",
    gradient: "from-[#f472b6] to-[#fb923c]",
  },
  {
    icon: Code,
    title: "Technical Specs",
    description: "Get detailed technical architecture, stack recommendations, and API designs.",
    gradient: "from-[#34d399] to-[#00d4ff]",
  },
  {
    icon: Rocket,
    title: "App Generation",
    description: "Deploy a working prototype - static sites, SPAs, or progressive web apps.",
    gradient: "from-[#fb923c] to-[#f472b6]",
  },
  {
    icon: Zap,
    title: "AI-Powered Chat",
    description: "Chat with AI to refine your idea, get insights, and build a stronger business case.",
    gradient: "from-[#00d4ff] to-[#7c3aed]",
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Hero gradient orb */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[radial-gradient(ellipse,rgba(0,212,255,0.08)_0%,rgba(124,58,237,0.05)_40%,transparent_70%)]" />
        {/* Secondary orb */}
        <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.06)_0%,transparent_70%)]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-bg opacity-40" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-[rgba(255,255,255,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.3)]">
                <Lightbulb className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">Idea2App</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Pricing
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                How It Works
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
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
      <section className="relative pt-36 pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
            <Badge className="mb-8" variant="secondary">
              <Sparkles className="h-3 w-3 mr-1.5 text-[#00d4ff]" />
              AI-Powered Business Idea Platform
            </Badge>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-8 animate-fade-up leading-[0.9]" style={{ animationDelay: "100ms" }}>
            Transform Your{" "}
            <span className="gradient-text">Ideas</span>
            <br />
            Into Reality
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-up leading-relaxed" style={{ animationDelay: "200ms" }}>
            From business idea to working application. Get competitive analysis, gap analysis, PRD documents, technical specs, and a deployed prototype &mdash; all powered by AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "300ms" }}>
            <Link href="/signup">
              <Button size="lg" className="gap-2 text-base px-10 h-14">
                Start Building
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-base px-10 h-14">
                Learn More
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-xl mx-auto animate-fade-up" style={{ animationDelay: "400ms" }}>
            {[
              { value: "5+", label: "Analysis Types" },
              { value: "AI", label: "Powered" },
              { value: "1-Click", label: "Deploy" },
            ].map((stat) => (
              <div key={stat.label} className="relative">
                <p className="text-3xl md:text-4xl font-black gradient-text">{stat.value}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(0,212,255,0.02)] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <Badge className="mb-5" variant="secondary">
              <Zap className="h-3 w-3 mr-1.5 text-[#7c3aed]" />
              Features
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-5">
              Everything You Need to{" "}
              <span className="gradient-text">Validate</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools to analyze, plan, and build your business idea from concept to deployment.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(12,12,20,0.5)] backdrop-blur-sm hover:border-[rgba(0,212,255,0.2)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.08)] hover:-translate-y-1"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:shadow-[0_0_20px_rgba(0,212,255,0.2)] transition-shadow duration-300`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 tracking-tight text-white">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-5" variant="secondary">
              <Rocket className="h-3 w-3 mr-1.5 text-[#f472b6]" />
              How It Works
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-5">
              From Idea to App in{" "}
              <span className="gradient-text">Minutes</span>
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                step: "01",
                title: "Describe Your Idea",
                description: "Create a project and describe your business idea. Chat with AI to refine it.",
                icon: Lightbulb,
                gradient: "from-[#00d4ff] to-[#0ea5e9]",
              },
              {
                step: "02",
                title: "Get AI-Powered Analysis",
                description: "Generate competitive analysis, gap analysis, PRDs, and technical specifications.",
                icon: BarChart3,
                gradient: "from-[#7c3aed] to-[#a855f7]",
              },
              {
                step: "03",
                title: "Review & Iterate",
                description: "Review the generated documents, chat with AI to refine, and iterate on your idea.",
                icon: FileText,
                gradient: "from-[#f472b6] to-[#fb923c]",
              },
              {
                step: "04",
                title: "Deploy Your App",
                description: "Choose your app type and let AI generate and deploy a working prototype.",
                icon: Rocket,
                gradient: "from-[#34d399] to-[#00d4ff]",
              },
            ].map((step) => (
              <div
                key={step.step}
                className="group flex items-start gap-6 p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(12,12,20,0.4)] backdrop-blur-sm hover:border-[rgba(0,212,255,0.2)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.06)]"
              >
                <div className="text-5xl font-black gradient-text shrink-0 leading-none">{step.step}</div>
                <div className="flex-1 pt-1">
                  <h3 className="text-xl font-bold mb-2 tracking-tight text-white">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{step.description}</p>
                </div>
                <div className={`hidden sm:flex h-12 w-12 rounded-xl bg-gradient-to-br ${step.gradient} items-center justify-center shrink-0 shadow-lg group-hover:shadow-[0_0_20px_rgba(0,212,255,0.2)] transition-shadow duration-300`}>
                  <step.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(124,58,237,0.02)] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <Badge className="mb-5" variant="secondary">
              <Shield className="h-3 w-3 mr-1.5 text-[#34d399]" />
              Pricing
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-5">
              Simple, Transparent{" "}
              <span className="gradient-text">Pricing</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Start for free, upgrade as you grow.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-2xl transition-all duration-300 ${
                  plan.highlighted
                    ? "bg-[rgba(12,12,20,0.7)] border border-[rgba(0,212,255,0.3)] shadow-[0_0_40px_rgba(0,212,255,0.1)] scale-[1.02]"
                    : "bg-[rgba(12,12,20,0.4)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)]"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <h3 className="text-xl font-bold tracking-tight text-white">{plan.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                <div className="mt-5 mb-6">
                  <span className="text-4xl font-black tracking-tight text-white">{plan.price}</span>
                  {plan.price !== "$0" && <span className="text-gray-400 text-sm">/mo</span>}
                </div>
                <div className="text-xs uppercase tracking-widest text-gray-400 mb-5 pb-5 border-b border-[rgba(255,255,255,0.06)]">
                  {plan.credits} credits/month
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <div className="h-4 w-4 rounded-full bg-[rgba(52,211,153,0.15)] flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 text-[#34d399]" />
                      </div>
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
      <section className="relative py-24 px-4">
        <div className="max-w-3xl mx-auto text-center relative">
          {/* Glow behind CTA */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse,rgba(0,212,255,0.08)_0%,rgba(124,58,237,0.05)_40%,transparent_70%)] pointer-events-none" />
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-5 relative">
            Ready to Build Your{" "}
            <span className="gradient-text">Next Big Thing?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 relative">
            Join builders who are using AI to transform their business ideas into reality.
          </p>
          <div className="relative">
            <Link href="/signup">
              <Button size="lg" className="gap-2 text-base px-10 h-14">
                Get Started for Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-[rgba(255,255,255,0.04)] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] flex items-center justify-center shadow-[0_0_10px_rgba(0,212,255,0.2)]">
                <Lightbulb className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">Idea2App</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
              <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
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
