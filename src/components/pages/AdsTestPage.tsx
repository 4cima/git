'use client'

import { useEffect, useRef, useState } from 'react'
import { Edit3, Eye, RotateCcw } from 'lucide-react'
// =============================================================
// تعريف الاعلانات الست
// =============================================================
const ADS = [
  { n: 1, id: 'a-728-90',  key: '0532fea1f51bb90a981bb89fb414869d', w: 728, h: 90,  label: 'Adsterra 728x90',  zone: '31008094' },
  { n: 2, id: 'a-300-250', key: '9a07073ebf48b3d7d98cf315a469e7c2', w: 300, h: 250, label: 'Adsterra 300x250', zone: '31008095' },
  { n: 3, id: 'a-160-600', key: '538636ef4b7a5d451e5c038b418c921e', w: 160, h: 600, label: 'Adsterra 160x600', zone: '31008096' },
  { n: 4, id: 'a-468-60',  key: '133edd7d82f4dab8a843a278994ce72d', w: 468, h: 60,  label: 'Adsterra 468x60',  zone: '31024533' },
  { n: 5, id: 'a-160-300', key: 'f72de37eaefbe39bbc12fcb14c7b6e73', w: 160, h: 300, label: 'Adsterra 160x300', zone: '31024534' },
  { n: 6, id: 'a-320-50',  key: '8096860698e0700c21bd43e4678196b0', w: 320, h: 50,  label: 'Adsterra 320x50',  zone: '31024535' },
] as const
type AdId = typeof ADS[number]['id']

// =============================================================
// مكون اعلان Adsterra واحد - mount مباشر
// =============================================================
function AdsterraAd({ id }: { id: AdId }) {
  const ref = useRef<HTMLDivElement>(null)
  const cfg = ADS.find(a => a.id === id)!
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
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,width:'100%',height:'100%',position:'relative'}}>
      <div style={{position:'absolute',top:6,right:6,background:'#ef4444',color:'white',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:4,zIndex:2,pointerEvents:'none'}}>#{cfg.n}</div>
      <div ref={ref} style={{width:cfg.w,height:cfg.h,maxWidth:'100%',maxHeight:'100%',border:'1px solid rgba(239,68,68,0.4)',background:'rgba(239,68,68,0.04)',borderRadius:6,overflow:'hidden'}} />
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
        <span style={{fontSize:11,color:'#a1a1aa'}}>{cfg.label}</span>
        <span style={{fontSize:9,color:'#52525b'}}>zone {cfg.zone}</span>
      </div>
    </div>
  )
}

// =============================================================
// الترتيب الافتراضي - 12 عمود
// =============================================================
type Pos = {x:number;y:number;w:number;h:number}
const DEFAULT_POS: Record<AdId, Pos> = {
  'a-728-90':  { x: 2, y: 1, w: 8, h: 3 },
  'a-300-250': { x: 0, y: 5, w: 4, h: 6 },
  'a-160-600': { x: 4, y: 5, w: 2, h: 9 },
  'a-160-300': { x: 6, y: 5, w: 2, h: 7 },
  'a-320-50':  { x: 8, y: 5, w: 4, h: 3 },
  'a-468-60':  { x: 2, y: 12, w: 8, h: 2 },
}

const COLS = 12
const ROW_PX = 50
const GAP = 8
const STORAGE_KEY = 'ads-test-pos-v4'

// =============================================================
// المكون الرئيسي
// =============================================================
export default function AdsTestPage() {
  const [editing, setEditing] = useState(false)
  const [containerWidth, setContainerWidth] = useState(1200)
  const [positions, setPositions] = useState<Record<string, Pos>>(DEFAULT_POS as any)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved && typeof saved === 'object') setPositions((p:any) => ({ ...p, ...saved }))
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
    <div style={{minHeight:'100vh',background:'#09090b',color:'#e4e4e7',fontFamily:'system-ui, sans-serif'}}>
      <style>{'@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}'}</style>
      <header style={{position:'sticky',top:0,zIndex:100,background:'#18181b',borderBottom:'1px solid #27272a'}}>
        <div style={{maxWidth:1400,margin:'0 auto',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:700,margin:0}}>🧪 صفحة تجربة الإعلانات</h1>
            <p style={{fontSize:12,color:'#71717a',margin:0}}>6 إعلانات Adsterra على 4cima.com — قابلة للسحب والتكبير</p>
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
              اسحب أي إعلان لتحريكه — اسحب الزاوية البرتقالية (يمين-تحت) لتكبيره. الترتيب يتحفظ تلقائياً.
            </div>
          </div>
        )}
      </header>

      <main ref={containerRef} style={{maxWidth:1400,margin:'0 auto',padding:16,position:'relative',minHeight:contentHeight}}>
        {ADS.map(ad => {
          const pos = (positions as any)[ad.id]; if (!pos) return null
          const left = pos.x * (colPx + GAP)
          const top = pos.y * (ROW_PX + GAP)
          const width = pos.w * colPx + (pos.w - 1) * GAP
          const height = pos.h * ROW_PX + (pos.h - 1) * GAP
          return (
            <div key={ad.id} style={{position:'absolute',left,top,width,height,outline:editing?'2px dashed #f59e0b':'none',borderRadius:12,zIndex:1,boxSizing:'border-box',background:'#18181b',border:'1px solid #27272a'}}>
              <div onMouseDown={e => startDrag(e, ad.id)} style={{width:'100%',height:'100%',position:'relative',cursor:editing?'move':'default',userSelect:'none',boxSizing:'border-box',overflow:'hidden',borderRadius:12}}>
                <AdsterraAd id={ad.id as AdId} />
                {editing && (
                  <>
                    <div style={{position:'absolute',top:6,left:6,background:'#f59e0b',color:'black',fontSize:10,padding:'2px 6px',borderRadius:4,fontWeight:600,pointerEvents:'none'}}>اسحبني</div>
                    <div onMouseDown={e => startResize(e, ad.id)} style={{position:'absolute',right:0,bottom:0,width:20,height:20,background:'#f59e0b',cursor:'nwse-resize',borderRadius:'4px 0 12px 0',zIndex:10}} />
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
