'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, Edit3, Eye, RotateCcw } from 'lucide-react'
const ADSTERRA = {
  'a-728-90':  { key: '0532fea1f51bb90a981bb89fb414869d', w: 728, h: 90, label: 'Adsterra 728x90' },
  'a-300-250': { key: '9a07073ebf48b3d7d98cf315a469e7c2', w: 300, h: 250, label: 'Adsterra 300x250' },
  'a-160-600': { key: '538636ef4b7a5d451e5c038b418c921e', w: 160, h: 600, label: 'Adsterra 160x600' },
} as const
type AdsterraId = keyof typeof ADSTERRA

function AdsterraBanner({ id }: { id: AdsterraId }) {
  const ref = useRef<HTMLDivElement>(null)
  const cfg = ADSTERRA[id]
  useEffect(() => {
    const el = ref.current; if (!el) return
    el.replaceChildren()
    ;(window as any).atOptions = { key: cfg.key, format: 'iframe', height: cfg.h, width: cfg.w, params: {} }
    const s = document.createElement('script')
    s.src = 'https://www.highrevenueformat.com/' + cfg.key + '/invoke.js'
    s.async = true
    el.appendChild(s)
    return () => { el.replaceChildren() }
  }, [id])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,width:'100%',height:'100%'}}>
      <div ref={ref} style={{width:cfg.w,height:cfg.h,maxWidth:'100%',maxHeight:'100%',border:'1px dashed rgba(239,68,68,0.5)',background:'rgba(239,68,68,0.05)',borderRadius:8,overflow:'hidden'}} />
      <span style={{fontSize:10,color:'#71717a'}}>{cfg.label}</span>
    </div>
  )
}

const MONETAG = {
  'm-728-90':  { w: 728, h: 90, label: 'Monetag 728x90' },
  'm-300-250': { w: 300, h: 250, label: 'Monetag 300x250' },
  'm-160-600': { w: 160, h: 600, label: 'Monetag 160x600' },
} as const
type MonetagId = keyof typeof MONETAG

function MonetagBanner({ id }: { id: MonetagId }) {
  const ref = useRef<HTMLDivElement>(null)
  const cfg = MONETAG[id]
  useEffect(() => {
    const el = ref.current; if (!el) return
    el.replaceChildren()
    const s = document.createElement('script')
    s.dataset.zone = '11699161'
    s.src = 'https://nap5k.com/tag.min.js'
    s.async = true
    el.appendChild(s)
    return () => { el.replaceChildren() }
  }, [id])
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,width:'100%',height:'100%'}}>
      <div ref={ref} style={{width:cfg.w,height:cfg.h,maxWidth:'100%',maxHeight:'100%',border:'1px dashed rgba(59,130,246,0.5)',background:'rgba(59,130,246,0.05)',borderRadius:8,overflow:'hidden'}} />
      <span style={{fontSize:10,color:'#71717a'}}>{cfg.label}</span>
    </div>
  )
}

function WatchButton() {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,width:'100%',height:'100%'}}>
      <button onClick={() => setTimeout(() => { window.location.href = '/' }, 400)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 32px',background:'linear-gradient(135deg, #16a34a, #059669)',color:'white',border:'none',borderRadius:12,fontSize:18,fontWeight:700,cursor:'pointer'}}>
        <Play style={{width:20,height:20}} fill="white" />
        <span>شاهد الآن</span>
      </button>
      <span style={{fontSize:10,color:'#71717a'}}>زر المشاهدة</span>
    </div>
  )
}

function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const onTime = () => { setCurrentTime(v.currentTime); setProgress((v.currentTime / v.duration) * 100) }
    const onDur = () => setDuration(v.duration)
    const onEnd = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onDur)
    v.addEventListener('ended', onEnd)
    return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('loadedmetadata', onDur); v.removeEventListener('ended', onEnd) }
  }, [])
  const togglePlay = () => { const v = videoRef.current; if (!v) return; if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) } }
  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted) }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => { const v = videoRef.current; if (!v) return; const r = e.currentTarget.getBoundingClientRect(); v.currentTime = ((e.clientX - r.left) / r.width) * v.duration }
  const skip = () => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10) }
  const fullscreen = () => { const v = videoRef.current; if (v?.requestFullscreen) v.requestFullscreen() }
  const fmt = (s: number) => Math.floor(s/60) + ':' + Math.floor(s%60).toString().padStart(2,'0')
  return (
    <div style={{position:'relative',width:'100%',height:'100%',background:'black',borderRadius:12,overflow:'hidden'}}>
      <video ref={videoRef} style={{width:'100%',height:'100%',display:'block'}} src="https://www.w3schools.com/html/mov_bbb.mp4" muted playsInline />
      {!playing && (
        <button onClick={togglePlay} style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.4)',border:'none',cursor:'pointer'}}>
          <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Play style={{width:40,height:40,fill:'white',color:'white',marginLeft:4}} />
          </div>
        </button>
      )}
      <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent, rgba(0,0,0,0.8))',padding:16}}>
        <div onClick={seek} style={{height:4,background:'rgba(255,255,255,0.2)',borderRadius:2,marginBottom:12,cursor:'pointer'}}>
          <div style={{height:'100%',background:'#ef4444',borderRadius:2,width:progress+'%'}} />
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,color:'white'}}>
          <button onClick={togglePlay} style={{background:'transparent',border:'none',color:'white',cursor:'pointer'}}>
            {playing ? <Pause style={{width:20,height:20}} /> : <Play style={{width:20,height:20}} />}
          </button>
          <button onClick={skip} style={{background:'transparent',border:'none',color:'white',cursor:'pointer'}}><SkipForward style={{width:20,height:20}} /></button>
          <button onClick={toggleMute} style={{background:'transparent',border:'none',color:'white',cursor:'pointer'}}>
            {muted ? <VolumeX style={{width:20,height:20}} /> : <Volume2 style={{width:20,height:20}} />}
          </button>
          <span style={{fontSize:12}}>{fmt(currentTime)} / {fmt(duration)}</span>
          <div style={{flex:1}} />
          <button onClick={fullscreen} style={{background:'transparent',border:'none',color:'white',cursor:'pointer'}}><Maximize style={{width:20,height:20}} /></button>
        </div>
      </div>
    </div>
  )
}

// =============================================================
// العنصر اللي بيتحط في الـ grid
// =============================================================
type Item =
  | { id: string; type: 'adsterra'; ad: AdsterraId }
  | { id: string; type: 'monetag'; ad: MonetagId }
  | { id: string; type: 'watch' }
  | { id: string; type: 'video' }
  | { id: string; type: 'ph'; label: string }
  | { id: string; type: 'hero' }

const DEFAULT_ITEMS: Item[] = [
  { id: 'hero', type: 'hero' },
  { id: 'a-728-90',  type: 'adsterra', ad: 'a-728-90' },
  { id: 'm-728-90',  type: 'monetag',  ad: 'm-728-90' },
  { id: 'a-300-250', type: 'adsterra', ad: 'a-300-250' },
  { id: 'm-300-250', type: 'monetag',  ad: 'm-300-250' },
  { id: 'a-160-600', type: 'adsterra', ad: 'a-160-600' },
  { id: 'm-160-600', type: 'monetag',  ad: 'm-160-600' },
  { id: 'watch',     type: 'watch' },
  { id: 'video',     type: 'video' },
  { id: 'ph1',       type: 'ph', label: 'محتوى تجريبي' },
]

// الترتيب الافتراضي (x,y,w,h) في شبكة 12 عمود
const DEFAULT_POS: Record<string, {x:number;y:number;w:number;h:number}> = {
  'hero':       { x: 0, y: 0,  w: 12, h: 2 },
  'a-728-90':   { x: 0, y: 2,  w: 6,  h: 2 },
  'm-728-90':   { x: 6, y: 2,  w: 6,  h: 2 },
  'a-300-250':  { x: 0, y: 4,  w: 3,  h: 4 },
  'm-300-250':  { x: 9, y: 4,  w: 3,  h: 4 },
  'a-160-600':  { x: 3, y: 4,  w: 3,  h: 6 },
  'm-160-600':  { x: 6, y: 4,  w: 3,  h: 6 },
  'watch':      { x: 0, y: 8,  w: 4,  h: 3 },
  'video':      { x: 4, y: 8,  w: 8,  h: 5 },
  'ph1':        { x: 0, y: 11, w: 12, h: 1 },
}

function renderItemContent(item: Item) {
  switch (item.type) {
    case 'hero':     return <HeroBlock />
    case 'adsterra': return <AdsterraBanner id={item.ad} />
    case 'monetag':  return <MonetagBanner id={item.ad} />
    case 'watch':    return <WatchButton />
    case 'video':    return <VideoPlayer />
    case 'ph':       return <PlaceholderBlock label={item.label} />
  }
}

function HeroBlock() {
  return (
    <div style={{height:'100%',width:'100%',borderRadius:12,border:'2px dashed #3f3f46',background:'#18181b',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{color:'#71717a',fontSize:14,marginBottom:4}}>مكان الهيرو (Hero)</div>
        <div style={{color:'#52525b',fontSize:11}}>Hero Placeholder</div>
      </div>
    </div>
  )
}

function PlaceholderBlock({ label }: { label: string }) {
  return (
    <div style={{height:'100%',width:'100%',borderRadius:12,border:'2px dashed #3f3f46',background:'#18181b',display:'flex',alignItems:'center',justifyContent:'center',color:'#71717a',fontSize:14}}>
      {label}
    </div>
  )
}

const STORAGE_KEY = 'ads-test-pos-v3'

// =============================================================
// المكون الرئيسي - grid بسيط + drag/resize يدوي
// =============================================================
const COLS = 12
const ROW_PX = 50
const GAP = 8

export default function AdsTestPage() {
  const [editing, setEditing] = useState(false)
  const [containerWidth, setContainerWidth] = useState(1200)
  const [positions, setPositions] = useState<Record<string, {x:number;y:number;w:number;h:number}>>(DEFAULT_POS as any)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved && typeof saved === 'object') setPositions((prev:any) => ({ ...prev, ...saved }))
      }
    } catch {}
  }, [])

  useEffect(() => {
    const update = () => { if (containerRef.current) setContainerWidth(containerRef.current.clientWidth) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const colPx = (containerWidth - GAP * (COLS - 1)) / COLS

  const dragRef = useRef<{id:string; sx:number; sy:number; ox:number; oy:number}|null>(null)
  const startDrag = (e: React.MouseEvent, id: string) => {
    if (!editing) return; e.preventDefault()
    const p = (positions as any)[id]
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y }
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', endDrag)
  }
  const onDragMove = (e: MouseEvent) => {
    const d = dragRef.current; if (!d) return
    const dx = Math.round((e.clientX - d.sx) / (colPx + GAP))
    const dy = Math.round((e.clientY - d.sy) / (ROW_PX + GAP))
    setPositions((p: any) => {
      const cur = p[d.id]
      const nx = Math.max(0, Math.min(COLS - cur.w, d.ox + dx))
      const ny = Math.max(0, d.oy + dy)
      return { ...p, [d.id]: { ...cur, x: nx, y: ny } }
    })
  }
  const endDrag = () => {
    if (dragRef.current) try { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)) } catch {}
    dragRef.current = null
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', endDrag)
  }

  const resizeRef = useRef<{id:string; sx:number; sy:number; ow:number; oh:number}|null>(null)
  const startResize = (e: React.MouseEvent, id: string) => {
    if (!editing) return; e.preventDefault(); e.stopPropagation()
    const p = (positions as any)[id]
    resizeRef.current = { id, sx: e.clientX, sy: e.clientY, ow: p.w, oh: p.h }
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', endResize)
  }
  const onResizeMove = (e: MouseEvent) => {
    const r = resizeRef.current; if (!r) return
    const dx = Math.round((e.clientX - r.sx) / (colPx + GAP))
    const dy = Math.round((e.clientY - r.sy) / (ROW_PX + GAP))
    setPositions((p: any) => {
      const cur = p[r.id]
      const nw = Math.max(1, Math.min(COLS - cur.x, r.ow + dx))
      const nh = Math.max(1, r.oh + dy)
      return { ...p, [r.id]: { ...cur, w: nw, h: nh } }
    })
  }
  const endResize = () => {
    if (resizeRef.current) try { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)) } catch {}
    resizeRef.current = null
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', endResize)
  }

  const reset = () => { setPositions(DEFAULT_POS as any); try { localStorage.removeItem(STORAGE_KEY) } catch {} }

  const maxY = Math.max(0, ...Object.values(positions).map(p => p.y + p.h))
  const contentHeight = maxY * (ROW_PX + GAP) + 32

  return (
    <div style={{minHeight:'100vh', background:'#09090b', color:'#e4e4e7', fontFamily:'system-ui, sans-serif'}}>
      <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}'}</style>
      <header style={{position:'sticky',top:0,zIndex:100,background:'#18181b',borderBottom:'1px solid #27272a'}}>
        <div style={{maxWidth:1400,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:700,margin:0}}>🧪 صفحة تجربة الإعلانات</h1>
            <p style={{fontSize:12,color:'#71717a',margin:0}}>6 بانرات (3 Adsterra + 3 Monetag) + زر + فيديو — قابل للسحب والتكبير</p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {editing && (
              <button onClick={reset} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:14,borderRadius:8,background:'#27272a',border:'1px solid #3f3f46',color:'#e4e4e7',cursor:'pointer'}}>
                <RotateCcw style={{width:16,height:16}} /> إعادة الضبط
              </button>
            )}
            <button onClick={() => setEditing(!editing)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',fontSize:14,fontWeight:600,borderRadius:8,border:'none',cursor:'pointer',background:editing?'#16a34a':'#f59e0b',color:'white'}}>
              {editing ? <><Eye style={{width:16,height:16}} /> وضع العرض</> : <><Edit3 style={{width:16,height:16}} /> وضع التعديل</>}
            </button>
          </div>
        </div>
        {editing && (
          <div style={{background:'rgba(120,53,15,0.3)',borderTop:'1px solid #78350f',padding:'8px 16px'}}>
            <div style={{maxWidth:1400,margin:'0 auto',display:'flex',alignItems:'center',gap:8,color:'#fde68a',fontSize:13}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#fbbf24',animation:'pulse 1.5s infinite'}} />
              اسحب أي مكون لتحريكه — اسحب الزاوية البرتقالية (يمين-تحت) لتكبيره. الترتيب يتحفظ تلقائياً.
            </div>
          </div>
        )}
      </header>

      <main ref={containerRef} style={{maxWidth:1400,margin:'0 auto',padding:16,position:'relative',minHeight:contentHeight}}>
        {DEFAULT_ITEMS.map(item => {
          const pos = (positions as any)[item.id]; if (!pos) return null
          const left = pos.x * (colPx + GAP)
          const top = pos.y * (ROW_PX + GAP)
          const width = pos.w * colPx + (pos.w - 1) * GAP
          const height = pos.h * ROW_PX + (pos.h - 1) * GAP
          return (
            <div key={item.id} style={{position:'absolute',left,top,width,height,outline:editing?'2px dashed #f59e0b':'none',outlineOffset:0,borderRadius:12,zIndex:1,boxSizing:'border-box'}}>
              <div onMouseDown={e => startDrag(e, item.id)} style={{width:'100%',height:'100%',position:'relative',cursor:editing?'move':'default',userSelect:'none',boxSizing:'border-box',overflow:'hidden',borderRadius:12}}>
                {renderItemContent(item)}
                {editing && (
                  <>
                    <div style={{position:'absolute',top:4,left:4,background:'#f59e0b',color:'black',fontSize:10,padding:'2px 6px',borderRadius:4,fontWeight:600,pointerEvents:'none'}}>اسحبني</div>
                    <div onMouseDown={e => startResize(e, item.id)} style={{position:'absolute',right:0,bottom:0,width:20,height:20,background:'#f59e0b',cursor:'nwse-resize',borderRadius:'4px 0 12px 0',zIndex:10}} />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
