import { useEffect } from "react";
import { Link } from "react-router-dom";
import HomeProfileForm from "../components/HomeProfileForm";

const bubbles = [
  { from: "agent", text: "What do you want to achieve?" },
  { from: "user", text: "Get into a Master's program in Canada" },
  { from: "agent", text: "Got it. Send me your CV when you can — I'll start mapping programs and scholarships that fit." },
  { from: "agent", text: "3 new matches today, and your language test deadline is in 12 days." },
];

const opportunities = [
  { kind: "Internships & jobs", desc: "Matched to your skills and target role, with a note on what's missing from your application." },
  { kind: "Universities & study programs", desc: "Filtered by field, country, and the constraints you've shared — language level, budget, timeline." },
  { kind: "Scholarships & grants", desc: "Checked against your eligibility before you spend an evening reading fine print." },
  { kind: "Hackathons, events & competitions", desc: "Surfaced when they actually build toward the goal, not just because they exist." },
  { kind: "Learning opportunities", desc: "Courses and resources aimed at the specific gap standing between you and the next step." },
];

const loopSteps = [
  ["Define a goal", "the ambition you stated"],
  ["Understand the user", "build the persistent context"],
  ["Analyze gaps", "what's missing to get there"],
  ["Discover opportunities", "search the outside world"],
  ["Prioritize", "rank by relevance to the goal"],
  ["Take action", "prepare, apply, schedule, remind"],
  ["Track progress", "keep the record up to date"],
  ["Adapt", "revise the strategy as things change"],
];

const briefingItems = [
  "2 new scholarship matches for your program in Montréal",
  "Motivation letter draft ready for review",
  "IELTS registration closes in 12 days",
  "Next best action: confirm your recommender for reference #2",
];

function Tag({ children }) {
  return (
    <span className="rounded-full border border-line px-3 py-1.5 text-[13px] text-ink/70">{children}</span>
  );
}

export default function Home() {
  useEffect(() => {
    document.title = "Personal Goal Agent — You define the goal. We help you get there.";
  }, []);

  return (
    <div className="bg-paper text-ink">
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-line bg-paper/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-7 py-4">
          <span className="font-display text-xl">Personal Goal Agent</span>
          <div className="flex items-center gap-5">
            <Link to="/console" className="text-sm text-ink/50 hover:text-ink">
              Console
            </Link>
            <a
              href="#start"
              className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-teal"
            >
              Get started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="px-7 py-20 sm:py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-[15px] font-medium text-teal">An AI agent that lives in WhatsApp</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.1] tracking-tight sm:text-5xl">
              You define the goal.
              <br />
              We help you get there.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink/70">
              Personal Goal Agent turns a single ambition — an internship, a scholarship, a new
              career — into a running strategy: it learns who you are, searches the outside
              world on your behalf, and tells you the next best action to take.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <a
                href="#start"
                className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-teal"
              >
                Get started
              </a>
              <a href="#loop" className="text-sm text-ink/60 underline decoration-line underline-offset-4">
                See how it works ↓
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[340px] rounded-[28px] bg-ink p-2.5 shadow-[0_30px_60px_-20px_rgba(20,32,28,0.35)]">
            <div className="flex min-h-[400px] flex-col justify-end gap-2.5 rounded-[20px] bg-sage px-3.5 py-4.5">
              {bubbles.map((b, i) => (
                <div
                  key={i}
                  style={{ animationDelay: `${0.1 + i * 0.8}s` }}
                  className={`max-w-[84%] animate-[bubble-rise_0.5s_ease_forwards] rounded-2xl px-3.5 py-2.5 text-sm opacity-0 motion-reduce:animate-none motion-reduce:opacity-100 ${
                    b.from === "agent"
                      ? "self-start rounded-bl-md bg-paper text-ink"
                      : "self-end rounded-br-md bg-teal text-paper"
                  }`}
                >
                  {b.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* How it starts */}
      <section className="px-7 py-20">
        <div className="mx-auto grid max-w-5xl gap-14 md:grid-cols-2">
          <div>
            <p className="text-[15px] font-medium text-teal">How it starts</p>
            <h2 className="mt-2.5 max-w-[16ch] font-display text-3xl">
              One question, then a strategy built around your answer
            </h2>
            <p className="mt-4 max-w-[46ch] text-[16.5px] text-ink/70">
              The experience starts with a simple question: “What do you want to achieve?”
              Whether you want to find an internship, study abroad, win a scholarship, land a
              better job, learn a new skill, or change careers entirely, the agent first
              understands the goal — then builds a personalized strategy around it.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Tag>Internships</Tag>
              <Tag>Universities abroad</Tag>
              <Tag>Scholarships</Tag>
              <Tag>Career changes</Tag>
              <Tag>New skills</Tag>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-7">
            <p className="text-[15px] font-medium text-teal">Persistent context</p>
            <p className="mt-2 text-[15px] text-ink/70">
              Built up gradually through conversation, not a form you fill in once.
            </p>
            <ul className="mt-4 divide-y divide-line">
              {[
                ["Who you are", "CV, education, skills, experience"],
                ["What you want", "interests, preferences, the goal itself"],
                ["What's in the way", "constraints and gaps"],
                ["Where you stand", "previous progress"],
              ].map(([label, desc]) => (
                <li key={label} className="flex gap-3 py-3 text-[15px] text-ink/70 first:pt-0 last:pb-0">
                  <span>
                    <b className="font-medium text-ink">{label}</b> — {desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Opportunities */}
      <section className="bg-ink px-7 py-20 text-paper">
        <div className="mx-auto max-w-5xl">
          <p className="text-[15px] font-medium text-gold">Beyond a list of results</p>
          <h2 className="mt-2.5 max-w-[26ch] font-display text-3xl">
            Every opportunity is checked against your profile before it reaches you
          </h2>
          <p className="mt-4 max-w-[60ch] text-[16.5px] text-paper/70">
            Instead of dumping search results, the agent evaluates each one against your
            profile and goal, explains why it's relevant, flags gaps or requirements you still
            need to cover, and surfaces the ones actually worth your time.
          </p>

          <div className="mt-10">
            {opportunities.map((o) => (
              <div key={o.kind} className="grid gap-1.5 border-t border-paper/10 py-5 last:border-b sm:grid-cols-[200px_1fr] sm:gap-5">
                <span className="font-display text-lg">{o.kind}</span>
                <span className="max-w-[60ch] text-[15px] text-paper/70">{o.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Action + briefing */}
      <section className="px-7 py-20">
        <div className="mx-auto grid max-w-5xl gap-14 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <div className="max-w-[520px] rounded-2xl border border-line bg-white p-6">
              <div className="mb-3.5 flex items-baseline justify-between border-b border-line pb-3.5">
                <span className="text-[15px] font-medium text-teal">Today's briefing</span>
                <span className="text-xs text-ink/50">7:00 AM</span>
              </div>
              <ul className="space-y-3">
                {briefingItems.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <p className="text-[15px] font-medium text-teal">Past recommending</p>
            <h2 className="mt-2.5 font-display text-3xl">It helps you act, not just decide</h2>
            <p className="mt-4 text-[16.5px] text-ink/70">
              The agent goes beyond recommendations: preparing applications, identifying
              missing documents, adapting a CV or motivation letter, tracking deadlines,
              scheduling events in your calendar, setting reminders, and organizing your
              learning tasks.
            </p>
            <p className="mt-3 text-[16.5px] text-ink/70">
              Every day, it can send a briefing with your most important opportunities,
              learning tasks, upcoming deadlines, and recommended actions — always answering
              one question: what's the next best move?
            </p>
          </div>
        </div>
      </section>

      {/* Core loop */}
      <section id="loop" className="bg-ink px-7 py-20 text-paper">
        <div className="mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-2">
          <div>
            <p className="text-[15px] font-medium text-gold">Not a chatbot</p>
            <h2 className="mt-2.5 font-display text-3xl text-paper">The core loop</h2>
            <p className="mt-3.5 max-w-[42ch] text-[16px] text-paper/70">
              A chatbot waits for questions and answers them. This agent has a persistent
              objective — it keeps working the loop below on its own.
            </p>
          </div>
          <div>
            {loopSteps.map(([title, desc], i) => (
              <div key={title} className="flex gap-4 border-b border-paper/10 py-3.5 last:border-none">
                <span className="w-6 flex-none font-display text-[15px] text-gold">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[15.5px] text-paper/70">
                  <b className="font-medium text-paper">{title}</b> — {desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why WhatsApp */}
      <section className="px-7 py-20">
        <div className="mx-auto max-w-[720px]">
          <p className="text-[15px] font-medium text-teal">Why WhatsApp</p>
          <h2 className="mt-2.5 max-w-[22ch] font-display text-3xl sm:text-4xl">
            One thread, instead of a browser full of tabs
          </h2>
          <p className="mt-4 max-w-[56ch] text-[16.5px] text-ink/70">
            The entire experience happens through WhatsApp, so there's no switching between
            job platforms, university websites, scholarship portals, learning platforms,
            calendars, and productivity tools. The agent continuously understands your state,
            searches the outside world, reasons about opportunities, recommends actions,
            executes what you've authorized, tracks progress, and adapts its strategy over
            time.
          </p>
          <blockquote className="mt-9 border-l-2 border-gold pl-6 font-display text-2xl italic text-gold sm:text-3xl">
            "What is the next best action this person should take to move closer to their
            goal?"
          </blockquote>
        </div>
      </section>

      {/* Profile form */}
      <section id="start" className="px-7 py-20">
        <div className="mx-auto grid max-w-5xl gap-14 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-[15px] font-medium text-teal">Get started</p>
            <h2 className="mt-2.5 max-w-[16ch] font-display text-3xl">Tell it what you're chasing</h2>
            <p className="mt-3.5 max-w-[38ch] text-base text-ink/70">
              This is the same information the agent would build up through conversation on
              WhatsApp — give it a head start here, and it'll pick up the thread there.
            </p>
          </div>
          <HomeProfileForm />
        </div>
      </section>

      {/* Closing */}
      <section className="bg-ink px-7 py-28 text-center text-paper">
        <div className="mx-auto max-w-5xl">
          <p className="text-[15px] font-medium text-gold">The vision</p>
          <h2 className="mx-auto mt-3.5 max-w-[18ch] font-display text-4xl text-paper sm:text-5xl">
            A personal AI agent that helps you navigate your future — by knowing where you
            want to go, not just answering what you ask.
          </h2>
          <div className="mt-8">
            <a
              href="#start"
              className="rounded-md bg-gold px-5 py-3 text-sm font-medium text-ink transition-colors hover:opacity-90"
            >
              Create my profile
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-7 py-7">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-2 text-[13px] text-ink/50">
          <span>Personal Goal Agent</span>
          <span>You define the goal. We help you get there.</span>
        </div>
      </footer>
    </div>
  );
}
