import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Shield, Users, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="font-bold text-xl">
            FairSplit
          </Link>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-24 text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Fair Utility Bill Splitting
            <br />
            <span className="text-primary">for Shared Housing</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            FairSplit uses a person-days algorithm to split utility bills
            proportionally based on each tenant&apos;s actual occupancy. No more
            arguments about who owes what.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/login">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="container py-16">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Person-Days Algorithm</h3>
              <p className="text-sm text-muted-foreground">
                Bills split proportionally by actual days of occupancy
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Multi-Tenant Support</h3>
              <p className="text-sm text-muted-foreground">
                Handle move-ins, move-outs, and overlapping tenancies
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Transparent Breakdowns</h3>
              <p className="text-sm text-muted-foreground">
                Every tenant can see exactly how their share was calculated
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">AI Bill Parsing</h3>
              <p className="text-sm text-muted-foreground">
                Upload bill PDFs and let AI extract the details automatically
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          FairSplit &mdash; Fair utility bill splitting for shared housing
        </div>
      </footer>
    </div>
  );
}
