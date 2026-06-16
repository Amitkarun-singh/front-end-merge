import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mic, MessageSquare, BookOpen, FileText, HelpCircle, Target,
  GraduationCap, Presentation, TrendingUp, Sparkles, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import aiGiniAvatar from "@/assets/ai-tutor-robot.png";

const features = [
  { title: "AI Tutor", icon: Mic, gradient: "from-purple-500 to-violet-600", desc: "Talk naturally with AI Gini. Get concepts explained like a personal tutor.", href: "/ai-tutor" },
  { title: "AI Gini", icon: MessageSquare, gradient: "from-blue-500 to-indigo-600", desc: "Upload homework, ask doubts via text or voice, get instant explanations.", href: "/ai-gini" },
  { title: "AI Notes", icon: BookOpen, gradient: "from-teal-400 to-cyan-500", desc: "Auto-generate structured, exam-ready notes for any chapter.", href: "/ai-notes" },
  { title: "Doc Summariser", icon: FileText, gradient: "from-pink-500 to-rose-500", desc: "Convert long documents into quick, easy-to-understand summaries.", href: "/summarizer" },
  { title: "AI Practice", icon: Target, gradient: "from-green-500 to-emerald-600", desc: "Topic-wise MCQs & subjective questions with adaptive difficulty.", href: "/ai-practice" },
  { title: "Student Performance", icon: TrendingUp, gradient: "from-teal-400 to-emerald-500", desc: "Track student progress with detailed analytics and insights.", href: "/performance" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-16 px-6 lg:px-12 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="max-w-4xl mx-auto text-center relative">
          {/* Avatar pop-up */}
          <motion.div
            className="relative mx-auto w-full max-w-3xl aspect-[1024/620] mb-6"
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 14, duration: 1 }}
          >
            {/* glow ring */}
            <motion.div
              className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30 blur-3xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Magical smoke rising from the genie lamp */}
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={`smoke-${i}`}
                className="absolute pointer-events-none z-20"
                style={{ left: `${56 + i * 1.2}%`, top: "62%" }}
                initial={{ opacity: 0, scale: 0.4, y: 0, x: 0 }}
                animate={{
                  opacity: [0, 0.7, 0],
                  scale: [0.4, 1.6, 2.2],
                  y: [0, -120, -220],
                  x: [0, i % 2 === 0 ? -25 : 25, i % 2 === 0 ? -55 : 55],
                }}
                transition={{
                  duration: 4,
                  delay: i * 0.7,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              >
                <div
                  className="w-10 h-10 rounded-full blur-xl"
                  style={{
                    background:
                      "radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, hsl(var(--secondary) / 0.4) 50%, transparent 80%)",
                  }}
                />
              </motion.div>
            ))}

            {/* Glowing magic dust trail from lamp */}
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={`dust-${i}`}
                className="absolute pointer-events-none z-20 w-1.5 h-1.5 rounded-full bg-accent"
                style={{
                  left: `${57 + (i % 3) * 1.5}%`,
                  top: "62%",
                  boxShadow: "0 0 8px hsl(var(--accent)), 0 0 16px hsl(var(--primary))",
                }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [0, -80 - i * 10, -180],
                  x: [0, (i - 3) * 12, (i - 3) * 30],
                  scale: [0.5, 1.2, 0],
                }}
                transition={{
                  duration: 2.8,
                  delay: i * 0.35,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}

            {/* Twinkling sparkles around avatar */}
            {[
              { left: "5%", top: "10%", size: 20, delay: 0, dur: 2.4 },
              { left: "92%", top: "15%", size: 24, delay: 0.4, dur: 2.8 },
              { left: "0%", top: "45%", size: 16, delay: 0.8, dur: 2.2 },
              { left: "96%", top: "50%", size: 22, delay: 1.2, dur: 2.6 },
              { left: "10%", top: "80%", size: 18, delay: 0.2, dur: 2.4 },
              { left: "88%", top: "82%", size: 26, delay: 0.6, dur: 3 },
              { left: "50%", top: "0%", size: 20, delay: 1, dur: 2.5 },
              { left: "25%", top: "5%", size: 18, delay: 1.4, dur: 2.3 },
              { left: "75%", top: "8%", size: 22, delay: 0.5, dur: 2.7 },
              { left: "15%", top: "30%", size: 14, delay: 1.6, dur: 2.1 },
              { left: "85%", top: "35%", size: 16, delay: 1.8, dur: 2.4 },
              { left: "30%", top: "20%", size: 14, delay: 2, dur: 2.2 },
            ].map((s, i) => (
              <motion.div
                key={`spark-${i}`}
                className="absolute pointer-events-none z-10"
                style={{ left: s.left, top: s.top }}
                animate={{
                  opacity: [0, 1, 0.6, 1, 0],
                  scale: [0, 1.4, 0.9, 1.2, 0],
                  rotate: [0, 90, 180, 270, 360],
                }}
                transition={{
                  duration: s.dur,
                  delay: s.delay,
                  repeat: Infinity,
                  repeatDelay: 1,
                  ease: "easeInOut",
                }}
              >
                <Sparkles
                  className="text-primary drop-shadow-[0_0_10px_hsl(var(--primary))]"
                  style={{ width: `${s.size}px`, height: `${s.size}px` }}
                />
              </motion.div>
            ))}
            <motion.div
              className="relative w-full h-full"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <img
                src={aiGiniAvatar}
                alt="AI Gini avatar with books and lamp"
                className="w-full h-full object-contain drop-shadow-2xl rounded-3xl"
              />
            </motion.div>
          </motion.div>

          <motion.h1
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            Meet <span className="text-gradient">AI Gini</span>
          </motion.h1>
          <motion.p
            className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            Your magical study companion — learn faster, stress less, score higher.
          </motion.p>

          <motion.div
            className="flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <Link to="/ai-tutor">
              <Button className="gradient-button h-12 px-6 text-base">
                <Sparkles className="w-4 h-4 mr-2" /> Try AI Tutor
              </Button>
            </Link>
            <Link to="/more-tools">
              <Button variant="outline" className="h-12 px-6 text-base">
                Explore Tools <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Everything AI Gini can do
            </h2>
            <p className="text-muted-foreground mt-2">Tap any tool to get started</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { delayChildren: 1.3, staggerChildren: 0.08 } },
            }}
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.9 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 18 } },
                }}
              >
                <Link
                  to={f.href}
                  className="group block edtech-card p-6 h-full hover:shadow-edtech-lg hover:-translate-y-1 transition-all"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Recents */}
      <section className="py-10 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Recents</h2>
            <Link to="/history" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              Go to Recent History <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="edtech-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No recent activity</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start learning with our AI tools to see your recent activity here
            </p>
            <Link to="/more-tools">
              <Button variant="outline">
                <Sparkles className="w-4 h-4 mr-2" /> Explore AI Tools
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}