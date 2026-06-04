import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const nav = useNavigate()

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen text-white bg-white" style={{backgroundColor: '#ffffff'}}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.3; }
        }
        @keyframes scale-hover {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animated-map {
          animation: float 8s ease-in-out infinite, pulse-opacity 6s ease-in-out infinite;
        }
        .section-with-bg {
          position: relative;
          background-image: url(/brand/world-map.svg);
          background-repeat: no-repeat;
          background-position: center;
          background-size: 50%;
          background-attachment: fixed;
        }
        .section-with-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url(/brand/world-map.svg);
          background-repeat: no-repeat;
          background-position: center;
          background-size: 50%;
          opacity: 0.15;
          pointer-events: none;
          animation: float 8s ease-in-out infinite, pulse-opacity 6s ease-in-out infinite;
        }
        .interactive-card {
          position: relative;
          z-index: 1;
        }
        .interactive-card:hover {
          animation: scale-hover 0.6s ease-in-out;
        }
        .collage-image {
          transition: all 0.3s ease-in-out;
          cursor: pointer;
          background: transparent !important;
          padding: 0 !important;
          border: none !important;
        }
        .collage-image:hover {
          transform: scale(1.08) translateY(-10px);
        }
      `}</style>
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-white shadow-sm">
        <div className="max-w-full mx-auto px-6 py-6 relative" style={{maxWidth: '1400px'}}>
          <img src="/engage.jpg" alt="ENA" className="h-28 w-auto object-contain absolute left-6 -top-5" />
          <nav className="flex items-center justify-center gap-8 text-sm text-slate-900">
            <button onClick={() => scrollTo('hero')} className="hover:text-[#1273de] transition">Home</button>
            <button onClick={() => scrollTo('about')} className="hover:text-[#1273de] transition">About</button>
            <button onClick={() => scrollTo('programs')} className="hover:text-[#1273de] transition">Programs</button>
            <button onClick={() => scrollTo('impact')} className="hover:text-[#1273de] transition">Impact</button>
            <button onClick={() => scrollTo('contact-footer')} className="hover:text-[#1273de] transition">Contact</button>
          </nav>
          <div className="absolute right-6 top-3">
            <button onClick={() => nav('/login')} className="ui-button-primary">Get Started</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="h-screen pt-24 relative bg-white overflow-hidden">
        <div className="animated-map absolute inset-0 flex items-center justify-center pointer-events-none" style={{backgroundImage: 'url(/brand/world-map.svg)', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '60%'}}></div>
        <div className="h-full w-full flex items-center relative z-10">
          <div className="relative z-10 max-w-full mx-auto px-6 w-full" style={{maxWidth: '1400px'}}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7">
                <h1 className="text-5xl md:text-6xl leading-tight font-extrabold text-slate-900">Empowering Communities. Creating Lasting Change.</h1>
                <p className="mt-6 text-lg md:text-xl text-slate-700 max-w-2xl">Sustainable development, education, healthcare, clean water, and economic opportunities across Africa.</p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <button onClick={() => scrollTo('about')} className="inline-flex items-center justify-center rounded-full bg-[#1273de] text-white px-6 py-3 text-sm font-semibold shadow hover:bg-[#0f63c3] transition">Learn More</button>
                  <button onClick={() => nav('/login')} className="inline-flex items-center justify-center rounded-full border-2 border-[#1273de] text-[#1273de] px-6 py-3 text-sm font-semibold hover:bg-[#1273de] hover:text-white transition">Get Started</button>
                </div>
              </div>

              <div className="lg:col-span-5 hidden lg:flex items-center justify-end pr-8 bg-transparent">
                {/* Right-side collage image (user provided at /public/africa-collage.png) */}
                <img src="/africa-collage.png" alt="Africa collage" className="collage-image w-[600px] max-w-full h-auto object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="section-with-bg min-h-screen pt-32 pb-16 text-slate-900 bg-white relative">
        <div className="max-w-full mx-auto px-6 relative z-10" style={{maxWidth: '1400px'}}>
          <div className="grid lg:grid-cols-2 gap-16 items-start mb-16">
            
            {/* Left column: Who We Are */}
            <div className="space-y-6 lg:sticky lg:top-32">
              <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6">Who We Are</h2>
              <p className="text-lg text-slate-700 leading-relaxed font-medium">Engage Now Africa (ENA) is an international NGO founded in 2002, committed to restoring hope and dignity to vulnerable communities across Africa. Through integrated programs in education, health, clean water, livelihoods, OVC support, and anti-human trafficking, ENA works to lift, heal and rescue lives. Today, ENA serves communities in Ethiopia, Ghana, Namibia, and Sierra Leone, creating lasting change together with local partners.</p>
            </div>

            {/* Right column: Vision, Mission & Theory of Change card */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-lg p-6 md:p-8 w-full flex flex-col gap-8">
              
              {/* Mission */}
              <div className="px-2">
                <div className="flex items-center gap-2 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#1273de]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <h3 className="text-xl font-extrabold text-slate-900">Mission</h3>
                </div>
                <p className="text-slate-600 text-sm md:text-base leading-relaxed font-normal">ENA's mission is to heal, rescue, and lift our brothers and sisters in Africa. Our purpose is to provide resources and training to vulnerable populations, enabling them to become self-reliant and substantially improve their lives. We accomplish our mission by developing greater capacity in the individuals and communities we serve. We focus on the fundamental building blocks that lead to individual self-reliance, including clean water, sanitation, health, education, micro-credit, and other income-generating activities that strengthen families and build communities.</p>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-slate-100" />

              {/* Vision */}
              <div className="px-2">
                <div className="flex items-center gap-2 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#1273de]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <h3 className="text-xl font-extrabold text-slate-900">Vision</h3>
                </div>
                <p className="text-slate-600 text-sm md:text-base leading-relaxed font-normal">Envisioning a world free of poverty with happy, self-reliant community made of virtuous individuals and families.</p>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-slate-100" />

              {/* Theory of Change */}
              <div className="px-2">
                <div className="flex items-center gap-2 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#1273de]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.656 48.656 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3M3 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M3 12l-3 3m3-3 3 3M9 5.25c.34-.144.698-.244 1.072-.292a48.293 48.293 0 0 1 3.856 0c.374.048.733.148 1.072.292M9 18.75c.34.144.698.244 1.072.292a48.293 48.293 0 0 0 3.856 0c.374-.048.733-.148 1.072-.292M12 9.75v4.5m0-4.5h.008v.008H12V9.75Z" />
                  </svg>
                  <h3 className="text-xl font-extrabold text-slate-900">Our Theory of Change</h3>
                </div>
                <p className="text-slate-600 text-sm md:text-base leading-relaxed font-normal">Our theory of change is based on a multi-faceted approach. We design projects and programs focused on addressing the needs of individuals and families vulnerable to poverty, aiming to empower recipients to become self-reliant. We mobilize local assets in collaboration with global partners, government ministers, and tribal leaders to align projects with community needs.</p>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="section-with-bg max-w-full mx-auto px-6 py-16 relative" style={{maxWidth: '1400px'}}>
        <div className="mb-12 text-left">
          <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-4 relative z-10">Program Focus Areas</h2>
        </div>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {[
            ['Education and Quality','We improve equitable access to quality education by strengthening school infrastructure, enhancing teaching quality, providing learning materials, supporting vulnerable children, and promoting community engagement to improve attendance and retention.', '/programs/education.jpg'],
            ['Health and Eye Care','We enhance access to essential health services through health facility construction, maternal and child health care, Early Childhood nutrition, community health awareness, and cataract and low-vision treatments to improve overall community health outcomes.', '/programs/health.jpeg'],
            ['Water, Sanitation, and Hygiene (WASH)','We work to improve access to safe drinking water, improve sanitation facilities, promote hygiene practices, and strengthen community management systems to reduce waterborne diseases and improve wellbeing.', '/programs/water.webp'],
            ['Women & Children Empowerment','We promote sustainable livelihoods, income-generating activities, and comprehensive support for orphans and vulnerable children, while strengthening life skills, leadership, and protection mechanisms.', '/programs/women.jpg'],
            ['Anti-Human Trafficking','We prevent human trafficking through awareness, education, and safe migration, while providing protection, recovery, and reintegration support for survivors.', '/programs/anti-traffic.png'],
          ].map((p) => (
            <div key={p[0] as string} className="interactive-card bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl hover:border-[#1273de] transition-all duration-300 flex flex-col">
              
              {/* Image Slot */}
              <div className="w-full h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                <img 
                  src={p[2]} 
                  alt={p[0]} 
                  className="w-full h-full object-cover absolute inset-0" 
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0';
                  }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(18,115,222,0.06),rgba(15,99,195,0.03))] flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-[#1273de]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </div>
              </div>

              {/* Content Slot */}
              <div className="p-6 flex-1 flex flex-col justify-between bg-white border-t border-slate-100">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-lg hover:text-[#1273de] transition-colors">{p[0]}</h4>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{p[1]}</p>
                </div>
              </div>

            </div>
          ))}
        </div>
      </section>

      {/* Impact */}
      <section id="impact" className="section-with-bg max-w-full mx-auto px-6 py-16 bg-white relative" style={{maxWidth: '1400px'}}>
        <div className="mb-12">
          <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-4 relative z-10">Our Impact</h2>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {[
            ['1.5 Million+', 'Total Beneficiaries served across Africa'],
            ['3,929', 'Cataract and low vision surgeries provided'],
            ['5,395+', 'Women supported with alternative income generating activities'],
            ['700k+', 'People reached with anti-human trafficking awareness and prevention'],
            ['9 Systems', '5 shallow well pumps & 4 deep well water systems developed'],
            ['4,747+', 'Orphans and vulnerable children supported'],
            ['71 Facilities', '47 schools and 24 health posts constructed'],
            ['9 Health Posts', '7 Maternal & Child Health facilities and 2 pharmacies built'],
          ].map((stat) => (
            <div key={stat[0]} className="interactive-card ui-panel p-6 text-center cursor-pointer hover:shadow-lg hover:border-[#1273de] transition-all duration-300">
              <div className="text-3xl font-extrabold text-[#1273de]">{stat[0]}</div>
              <div className="text-sm text-slate-600 mt-2 font-medium">{stat[1]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="section-with-bg max-w-full mx-auto px-6 py-16 bg-white relative overflow-hidden" style={{maxWidth: '1400px'}}>

        {/* Government Partners */}
        <div className="mb-14">
          <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-10">Partners</h2>
          <h3 className="text-xl font-bold text-[#1273de] uppercase tracking-widest mb-6">Government Partners</h3>
          <div className="flex flex-col gap-0 max-w-lg">
            {[
              'Ministry of Finance',
              'Ministry of Water and Energy',
              'Ministry of Women and Children Affairs',
              'Ministry of Justice',
            ].map((ministry, i) => (
              <div key={ministry} className="flex items-stretch group">
                <div className="w-0.5 bg-slate-200 group-hover:bg-[#1273de] transition-colors duration-300 mr-5 flex-shrink-0" />
                <div className="py-4 flex-1 border-b border-slate-100 last:border-b-0">
                  <p className="text-base font-semibold text-slate-800 group-hover:text-[#1273de] transition-colors duration-300">{ministry}</p>
                  <p className="text-xs text-slate-400 mt-0.5">At Regional Levels</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Our Partners — scrolling marquee */}
        <div>
          <h3 className="text-xl font-bold text-[#1273de] uppercase tracking-widest mb-8">Our Partners</h3>

          <div
            className="relative overflow-hidden py-4"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
            }}
          >
            <div
              className="flex items-center gap-12 w-max"
              style={{ animation: 'marquee 36s linear infinite' }}
            >
              {/* Partner list — duplicated for seamless infinite loop */}
              {[0, 1].map((pass) => (
                <div key={pass} className="flex items-center gap-16">

                  {/* The Stirling Foundation — image */}
                  <div className="flex-shrink-0 h-28 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                    <img src="/partners/stirling-foundation.jpg" alt="The Stirling Foundation" className="h-24 w-auto object-contain" />
                  </div>

                  {/* Forever Young Foundation — image */}
                  <div className="flex-shrink-0 h-28 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                    <img src="/partners/forever-young.jpeg" alt="Forever Young Foundation" className="h-24 w-auto object-contain" />
                  </div>

                  {/* The Church of Jesus Christ of Latter-day Saints — image */}
                  <div className="flex-shrink-0 h-28 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                    <img src="/partners/lds-church.png" alt="The Church of Jesus Christ of Latter-day Saints" className="h-24 w-auto object-contain" />
                  </div>

                  {/* Sunriders — bold text logo */}
                  <div className="flex-shrink-0 h-28 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                    <span style={{ fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: '2.2rem', letterSpacing: '-0.02em', color: '#1a1a2e', textShadow: '1px 1px 0 rgba(0,0,0,0.08)' }}>
                      Sunriders
                    </span>
                  </div>

                  {/* Cure Blindness — image */}
                  <div className="flex-shrink-0 h-28 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                    <img src="/partners/cure-blindness.png" alt="Cure Blindness" className="h-24 w-auto object-contain" />
                  </div>

                  {/* Thinking Schools International — image */}
                  <div className="flex-shrink-0 h-28 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                    <img src="/partners/thinking-schools.jpg" alt="Thinking Schools International" className="h-24 w-auto object-contain" />
                  </div>

                  {/* Chris and Shoko Trust — image */}
                  <div className="flex-shrink-0 h-28 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                    <img src="/partners/chris-shoko-trust.png" alt="Chris and Shoko Trust" className="h-24 w-auto object-contain" />
                  </div>

                  {/* Edward Hsu — bold text logo */}
                  <div className="flex-shrink-0 h-28 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                    <span style={{ fontFamily: "'Trebuchet MS', sans-serif", fontWeight: 900, fontSize: '2rem', letterSpacing: '0.05em', color: '#0f3460', textTransform: 'uppercase' }}>
                      Edward Hsu
                    </span>
                  </div>

                  {/* Finote Tehadso — styled multi-line text logo */}
                  <div className="flex-shrink-0 h-28 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                    <div style={{ fontFamily: 'Georgia, serif', fontWeight: 800, lineHeight: 1.25, color: '#1b1b2f', textAlign: 'center' }}>
                      <div style={{ fontSize: '1rem', letterSpacing: '0.04em' }}>FINOTE TEHADSO</div>
                      <div style={{ fontSize: '1rem', letterSpacing: '0.04em' }}>LEAKAL GUDATEGNA</div>
                      <div style={{ fontSize: '1rem', letterSpacing: '0.04em' }}>SETOCH MAHIBER</div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes marquee {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </div>

      </section>

      <footer id="contact-footer" className="mt-0 bg-[linear-gradient(135deg,#0a3a8c_0%,#1157c9_50%,#1e6fe0_100%)] text-white">
        {/* Top border accent */}
        <div className="h-1 w-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)]" />

        <div className="max-w-full mx-auto px-8 py-16" style={{maxWidth: '1400px'}}>
          {/* Main grid — 4 equal columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

            {/* Column 1: Logo + Tagline */}
            <div className="flex flex-col gap-4">
              <img src="/logo.jpg" alt="Engage Now Africa" className="h-20 w-auto object-contain rounded-lg" />
              <p className="text-sm text-white/80 leading-relaxed mt-1">
                Restoring hope and dignity to vulnerable communities across Africa — through education, health, clean water, and self-reliance.
              </p>
              <p className="text-xs text-white/50 mt-1 font-medium tracking-wide uppercase">Heal · Rescue · Lift</p>
            </div>

            {/* Column 2: Quick Links */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">Quick Links</h4>
              <ul className="flex flex-col gap-3">
                {[
                  ['About', 'about'],
                  ['Program Focus Areas', 'programs'],
                  ['Our Impact', 'impact'],
                  ['Partners', 'partners'],
                ].map(([label, id]) => (
                  <li key={id}>
                    <button
                      onClick={() => scrollTo(id)}
                      className="text-sm text-white/80 hover:text-white hover:pl-1 transition-all duration-200 flex items-center gap-2 group"
                    >
                      <span className="block w-4 h-px bg-white/30 group-hover:w-6 group-hover:bg-white transition-all duration-200" />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Contact */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">Contact</h4>
              <div className="flex flex-col gap-3 text-sm text-white/80">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  <span>Oromia, Bishoftu City<br />Kebele 02, House no.134<br />P.O.Box: 1607</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                  <span>0114372727</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  <span>engagenowafrica.tenkir<br />@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253" />
                  </svg>
                  <span>www.engagenowafrica.org</span>
                </div>
              </div>
            </div>

            {/* Column 4: Follow Us */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">Follow Us</h4>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Facebook', letter: 'f' },
                  { label: 'Twitter / X', letter: '𝕏' },
                  { label: 'Instagram', letter: 'ig' },
                ].map(({ label, letter }) => (
                  <a key={label} href="#" className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold group-hover:bg-white/20 group-hover:border-white/40 transition-all duration-200">
                      {letter}
                    </div>
                    <span className="text-sm text-white/70 group-hover:text-white transition-colors duration-200">{label}</span>
                  </a>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="max-w-full mx-auto px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50" style={{maxWidth: '1400px'}}>
            <span>© {new Date().getFullYear()} Engage Now Africa. All rights reserved.</span>
            <span>Oromia, Ethiopia · West Africa · Southern Africa</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
