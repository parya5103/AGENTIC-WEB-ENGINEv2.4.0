import escapeHtml from "escape-html";

export const generateEmpireHtml = (category: any, posts: any[] = [], post?: any) => {
  const siteTitle = "NicheFlow AI Empire";
  const colors = category?.style?.primaryColor ? { primary: category.style.primaryColor, accent: category.style.accentColor || category.style.primaryColor, background: "#FFFFFF" } : { primary: "#000000", accent: "#000000", background: "#FFFFFF" };
  
  const content = post ? `
    <article class="max-w-4xl mx-auto py-20 px-8">
      <nav class="mb-12 text-sm font-bold uppercase tracking-widest text-gray-400">
        <a href="/empire" class="hover:text-black">Empire Home</a> / 
        <a href="/cat/${escapeHtml(category.slug)}" class="hover:text-black">${escapeHtml(category.name)}</a>
      </nav>
      <h1 class="text-5xl md:text-7xl font-black tracking-tight mb-12">${escapeHtml(post.title)}</h1>
      ${post.imageUrl ? `<img src="${escapeHtml(post.imageUrl)}" class="w-full h-auto rounded-[40px] mb-12 shadow-2xl border border-gray-100" alt="${escapeHtml(post.title)}" />` : ""}
      <div class="prose prose-xl max-w-none prose-slate">
        ${escapeHtml(post.content).replace(/\n/g, "<br>")}
      </div>
    </article>
  ` : `
    <header class="py-32 px-8 text-center max-w-5xl mx-auto space-y-8">
      <div class="w-full h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-[10px] font-black uppercase text-gray-300 tracking-widest mb-12">AdSense Deployment Area (Top Slot)</div>
      <span class="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-400">Authority Category</span>
      <h1 class="text-6xl md:text-9xl font-black tracking-tighter">${escapeHtml(category.name)}</h1>
      <p class="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed font-medium font-serif italic">
        ${escapeHtml(category.description)}
      </p>
    </header>

    <main class="max-w-7xl mx-auto px-8 py-20">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
        ${posts.map((p: any) => `
          <a href="/cat/${escapeHtml(category.slug)}/${escapeHtml(p.slug)}" class="group block space-y-8">
            <div class="aspect-[16/10] bg-gray-50 rounded-[40px] overflow-hidden border border-gray-100 flex items-center justify-center relative">
               ${p.imageUrl ? 
                  `<img src="${escapeHtml(p.imageUrl)}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                   <div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500"></div>` 
                  : ''
               }
               <div class="text-center relative z-10 px-8">
                 <div class="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Internal Index</div>
                 <div class="text-2xl font-black tracking-tight text-white group-hover:scale-105 transition-transform duration-700">${escapeHtml(p.title)}</div>
               </div>
            </div>
            <div class="space-y-4">
              <h3 class="text-3xl font-bold tracking-tight">${escapeHtml(p.title)}</h3>
              <p class="text-gray-500 line-clamp-3 leading-relaxed">${escapeHtml(p.excerpt || "")}</p>
              <div class="pt-4 flex items-center gap-2 group-hover:gap-4 transition-all duration-500">
                <span class="text-[11px] font-black uppercase tracking-widest">Read Authority Guide</span>
                <div class="h-[2px] w-8 bg-black"></div>
              </div>
            </div>
          </a>
        `).join("")}
      </div>
    </main>
    <section class="max-w-7xl mx-auto px-8 mb-32">
       <div class="w-full h-64 bg-gray-50 border border-dashed border-gray-200 rounded-[40px] flex items-center justify-center text-[10px] font-black uppercase text-gray-300 tracking-[0.4em]">High-Yield Monetization Node (Content Slot)</div>
    </section>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(post ? post.title : category.name)} | ${siteTitle}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Baskervville:italic&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: ${colors.background}; }
        h1, h2, h3 { letter-spacing: -0.05em; }
        .font-serif { font-family: 'Baskervville', serif; }
    </style>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-EMPIRE" crossorigin="anonymous"></script>
</head>
<body class="antialiased">
    <nav class="p-10 flex justify-between items-center border-b border-gray-50">
        <a href="/empire" class="text-2xl font-black tracking-tighter uppercase group flex items-center gap-3">
          <div class="w-8 h-8 bg-black rounded-lg group-hover:rotate-45 transition-transform duration-500"></div>
          ${siteTitle}
        </a>
        <div class="hidden lg:flex gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            <a href="/empire" class="hover:text-black">Trends</a>
            <a href="#" class="hover:text-black">Intelligence</a>
            <a href="#" class="hover:text-black">Capital</a>
            <a href="#" class="hover:text-black">Authority</a>
        </div>
        <button class="bg-black text-white px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform">Empire Login</button>
    </nav>
    ${content}
    <footer class="bg-black text-white py-32 px-10 text-center">
        <div class="text-5xl font-black mb-12 tracking-tighter uppercase italic">${siteTitle}</div>
        <div class="flex justify-center gap-12 text-[9px] font-black uppercase tracking-[0.3em] mb-20">
          <a href="#" class="opacity-50 hover:opacity-100">About</a>
          <a href="#" class="opacity-50 hover:opacity-100">Privacy</a>
          <a href="#" class="opacity-50 hover:opacity-100">Contact</a>
          <a href="#" class="opacity-50 hover:opacity-100">Legal</a>
        </div>
        <p class="text-gray-600 text-[9px] tracking-[0.4em] uppercase font-bold">© 2026 NicheFlow Global Holdings. All assets AI-managed.</p>
        <div class="mt-8 opacity-20 flex justify-center items-center gap-4">
           <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg>
           <span class="text-[8px] font-black tracking-widest uppercase">Powered by Vercel Edge Runtime</span>
        </div>
    </footer>
</body>
</html>`;
};

export const generateHomeHtml = (categories: any[]) => {
  const siteTitle = "NicheFlow AI Empire";
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${siteTitle} | Global Content Authority</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Baskervville:italic&display=swap" rel="stylesheet">
    <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-white">
    <nav class="p-10 flex justify-between items-center border-b border-gray-50">
        <div class="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
          <div class="w-8 h-8 bg-black rounded-lg"></div>
          ${siteTitle}
        </div>
        <div class="hidden lg:flex gap-12 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            <a href="#">Trends</a>
            <a href="#">Network</a>
            <a href="#">Infrastructure</a>
        </div>
    </nav>

    <header class="py-40 px-10 text-center max-w-6xl mx-auto space-y-12">
        <div class="inline-block px-6 py-2 border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 bg-gray-50">Global Network Active</div>
        <h1 class="text-7xl md:text-9xl font-black tracking-tighter leading-[0.85]">THE EMPIRE OF<br/><span class="text-gray-200">NICHE AUTHORITY.</span></h1>
        <p class="text-2xl text-gray-400 max-w-2xl mx-auto font-medium font-serif italic">
          Scaling intelligent content clusters across multiple high-yield domains.
        </p>
    </header>

    <main class="max-w-7xl mx-auto px-10 pb-40">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          ${categories.map(cat => `
            <a href="/cat/${escapeHtml(cat.slug)}" class="group relative aspect-[16/10] bg-gray-50 rounded-[60px] overflow-hidden p-16 flex flex-col justify-end border border-gray-50 hover:border-gray-200 transition-all duration-700">
               <div class="absolute top-16 right-16 px-6 py-2 bg-white rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-100 group-hover:scale-110 transition-transform">Live Authority</div>
               <div class="space-y-4">
                 <h2 class="text-5xl font-black tracking-tight group-hover:translate-x-4 transition-transform duration-700">${escapeHtml(cat.name)}</h2>
                 <p class="text-gray-400 max-w-md line-clamp-2">${escapeHtml(cat.description)}</p>
                 <div class="pt-8 flex items-center gap-6 group-hover:gap-10 transition-all duration-1000">
                    <span class="text-[11px] font-black uppercase tracking-widest">Enter Category</span>
                    <div class="h-[2px] grow bg-black/10 origin-left scale-x-0 group-hover:scale-x-100 transition-transform"></div>
                 </div>
               </div>
            </a>
          `).join("")}
          ${categories.length === 0 ? `<div class="col-span-full py-40 text-center text-gray-300 font-black uppercase tracking-widest border-2 border-dashed border-gray-100 rounded-[60px]">System Initializing... Niche Discovery in Progress</div>` : ""}
        </div>
    </main>

    <footer class="bg-black text-white py-32 px-10 text-center">
        <div class="text-5xl font-black mb-12 tracking-tighter uppercase italic">${siteTitle}</div>
        <p class="text-gray-600 text-[9px] tracking-[0.4em] uppercase font-bold">© 2026 NicheFlow Global Holdings. All assets AI-managed.</p>
        <div class="mt-8 opacity-20 flex justify-center items-center gap-4">
           <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg>
           <span class="text-[8px] font-black tracking-widest uppercase">Powered by Vercel Edge Runtime</span>
        </div>
    </footer>
</body>
</html>`;
};
