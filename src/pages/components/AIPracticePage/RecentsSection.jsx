import { Link } from "react-router-dom";
import { FileText, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const RecentsSection = () => (
  <section className="py-10 px-6 lg:px-12">
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Recents
        </h2>
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Go to Recent History
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="edtech-card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">
          No recent activity
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start learning with our AI tools to see your recent activity here
        </p>
        <Button variant="outline">
          <Sparkles className="w-4 h-4 mr-2" />
          Explore AI Tools
        </Button>
      </div>
    </div>
  </section>
);

export default RecentsSection;
