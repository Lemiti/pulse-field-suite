import { useState } from 'react';
import {
  HelpCircle,
  Search,
  BookOpen,
  Cpu,
  Database,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Mail,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface FAQItem {
  question: string;
  answer: string;
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  // Form State
  const [category, setCategory] = useState('General Support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqs: FAQItem[] = [
    {
      question: 'How do I request a budget increase?',
      answer: 'Budget adjustments are initiated by Project Managers from the Project Settings tab. Simply input the revised target budget, upload the justification statement, and save. The changes will queue for organization admin review and approval at headquarters.',
    },
    {
      question: 'How does offline sync work?',
      answer: 'Our field suite automatically caches your updates (such as project logs, expenses, asset registrations, or beneficiary profiles) using local browser storage when you lose network connectivity. The status bar at the top-right header will display a pending sync banner. Once a stable internet connection is restored, synchronization will automatically process.',
    },
    {
      question: 'How do I archive a project?',
      answer: 'Only authorized System Administrators or Project Managers can archive a project. Go to the project dashboard, navigate to the Settings tab, scroll to the bottom Danger Zone, and click Archive Project. Once archived, the project enters a read-only state, disabling all active buttons (such as record expense, logs, etc.).',
    },
    {
      question: 'Who do I contact for database discrepancies?',
      answer: 'For database discrepancies, field sync mismatches, or user role access issues, please submit the HQ Support form below. You can also send a direct notification to the regional coordinator or email our headquarters IT team directly at hq-support@engagenowafrica.org.',
    },
  ];

  const categories = [
    {
      title: 'Getting Started',
      icon: <BookOpen className="w-6 h-6 text-blue-500" />,
      description: 'Quick walkthroughs, onboarding checklists, and dashboard navigation guides.',
      topics: ['System Navigation', 'User Profiles & Settings', 'Access Level Matrix'],
    },
    {
      title: 'Project & Task Workflow',
      icon: <FileText className="w-6 h-6 text-emerald-500" />,
      description: 'How to manage project details, assign tasks, update statuses, and view timelines.',
      topics: ['Creating Projects & Phases', 'Task Boards & Calendar', 'Archiving Projects'],
    },
    {
      title: 'Logistics & Beneficiaries',
      icon: <Cpu className="w-6 h-6 text-amber-500" />,
      description: 'Registering logistics assets, tracking procurement pipelines, and linking beneficiaries.',
      topics: ['Asset Registrations', 'Region/Zone/Woreda Address Formats', 'Beneficiary Linking'],
    },
    {
      title: 'Offline Sync & Data Care',
      icon: <WifiOff className="w-6 h-6 text-indigo-500" />,
      description: 'Resolving offline conflicts, managing sync states, and database backup.',
      topics: ['IndexedDB Offline Stashing', 'Conflict Resolution', 'Sync Pending Status'],
    },
  ];

  const filteredCategories = searchQuery.trim()
    ? categories.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : categories;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all support request fields.');
      return;
    }

    setIsSubmitting(true);

    // Simulate POST request to the support endpoint
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Support ticket submitted successfully! IT / HQ support will follow up shortly.');
      setSubject('');
      setMessage('');
      setCategory('General Support');
    }, 1200);
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  return (
    <div className="space-y-8 animate-fade-in p-2 md:p-6 select-none max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-900/40 dark:to-slate-900/60 p-8 md:p-12 text-white shadow-lg border border-transparent dark:border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-blue-200" />
            Knowledge Base & HQ Support
          </h1>
          <p className="text-blue-100 mt-2 text-sm md:text-base leading-relaxed">
            Find documentation guides, offline sync troubleshooting, and contact information for IT admin and field coordinators.
          </p>
          
          {/* SEARCH BAR */}
          <div className="mt-6 flex items-center bg-white/10 dark:bg-slate-950/40 backdrop-blur-md border border-white/20 dark:border-slate-800 rounded-xl p-3 max-w-md shadow-inner">
            <Search className="w-5 h-5 text-blue-200 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics or articles..."
              className="bg-transparent text-sm w-full outline-none text-white placeholder-blue-200"
            />
          </div>
        </div>
        {/* Abstract background blur shapes */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/20 rounded-full filter blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-indigo-500/15 rounded-full filter blur-3xl pointer-events-none -mb-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: Categories & FAQ (Col-Span 2) */}
        <div className="lg:col-span-2 space-y-8">
          {/* HELP CATEGORIES */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Help Categories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-800 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 shadow-inner">
                          {cat.icon}
                        </span>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                          {cat.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                        Subtopics
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-650 dark:text-slate-350">
                        {cat.topics.map((t, tIdx) => (
                          <li key={tIdx} className="flex items-center gap-1.5 hover:text-blue-500 cursor-pointer transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12 text-sm text-slate-400 dark:text-slate-500">
                  No categories match your search. Try adjusting the query.
                </div>
              )}
            </div>
          </div>

          {/* FAQ SECTION */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              Frequently Asked Questions (FAQ)
            </h2>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              {faqs.map((faq, index) => (
                <div key={index} className="transition-all">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full flex justify-between items-center px-5 py-4 text-left font-semibold text-sm text-slate-850 dark:text-slate-205 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {openFAQIndex === index ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  {openFAQIndex === index && (
                    <div className="px-5 pb-5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans bg-slate-50/50 dark:bg-slate-900/30">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Contact HQ Form (Col-Span 1) */}
        <div className="space-y-6">
          {/* IT SUPPORT CARD */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative">
            <h3 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-blue-500" />
              Contact IT / HQ Support
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed mb-4">
              Encountering data discrepancies or offline errors? Send a support ticket directly to the organization HQ developers.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Ticket Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold text-slate-800 dark:text-white rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="General Support">General Support</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Data Access">Data Access / Role Settings</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summarize the support request..."
                  className="w-full h-10 px-3 text-xs font-semibold text-slate-800 dark:text-white rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Describe the issue
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Provide precise details, error messages, or steps to reproduce the bug..."
                  className="w-full p-3 text-xs font-semibold text-slate-850 dark:text-white rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400 leading-relaxed font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/60 text-white text-xs font-bold transition shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Ticket...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit HQ Ticket</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* TELEPHONE & EMAIL CARD */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950/50 text-xs text-slate-600 dark:text-slate-400 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-white">IT Admin Contact Info</h4>
            <div className="space-y-2">
              <p>
                <strong>HQ HQ Email:</strong> support@engagenowafrica.org
              </p>
              <p>
                <strong>Admin Phone:</strong> +233 (0) 30 252 2333
              </p>
              <p>
                <strong>Operating Hours:</strong> 8:00 AM – 5:00 PM GMT (Mon–Fri)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
