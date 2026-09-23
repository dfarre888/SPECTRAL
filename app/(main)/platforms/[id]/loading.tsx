export default function PlatformDetailLoading() {
  return (
    <div className="animate-pulse motion-reduce:animate-none space-y-6" aria-busy="true" aria-label="Loading platform dossier">
      <div className="h-4 w-32 rounded-md store-panel" />
      <div className="h-9 w-[min(420px,100%)] rounded-xl store-panel" />
      <div className="h-24 rounded-2xl store-panel" />
      <div className="grid xl:grid-cols-2 gap-4">
        <div className="h-[520px] rounded-2xl store-panel" />
        <div className="h-[380px] rounded-2xl store-panel" />
      </div>
    </div>
  )
}
