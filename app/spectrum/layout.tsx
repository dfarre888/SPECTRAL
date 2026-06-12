/** SPECTRA keeps its own Liquid Glass rail — only align page canvas tokens. */
export default function SpectrumLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hub-page-canvas h-[calc(100vh-20px)] overflow-auto">
      {children}
    </div>
  )
}
