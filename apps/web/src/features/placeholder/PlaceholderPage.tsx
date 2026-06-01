export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-8 text-slate-400">
      <h2 className="text-2xl font-bold mb-2 text-slate-700">{title}</h2>
      <p className="text-sm">This section is currently under construction in this sprint.</p>
    </div>
  );
}
