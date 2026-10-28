import { useEffect, useRef, useState } from 'react';
import type { CoreExperience, Phase } from './scene/CoreExperience';
import { experiments } from './scene/experiments';

const partLabel = (name: string) =>
  name.startsWith('Shell')
    ? Number(name.slice(-2)) < 4
      ? 'HINGED CERAMIC ARMOUR'
      : 'RELEASE CAM'
    : name.startsWith('Coil')
      ? 'LAMINATED FLUX GUIDE'
      : name === 'Rotor_Front'
        ? 'OPTICAL YOKE'
        : name === 'Stator_Rear'
          ? 'LOAD-BEARING SPINE'
          : name === 'Induction_Ring'
            ? 'SPLIT LENS'
            : name;
const partInfo = (name: string) =>
  name.startsWith('Shell')
    ? Number(name.slice(-2)) < 4
      ? '沿外侧铰链折开的陶瓷护甲。锁扣释放后，护甲转动并滑离中央光路。'
      : '约束护甲的偏心锁扣。先旋转退锁，重组时最后扣合。'
    : name.startsWith('Coil')
      ? '继承原始机芯的铜质叠片，重新分布在承力脊两侧。护甲打开后沿支架滑移，显露导流通道。'
      : name === 'Rotor_Front'
        ? '开放式的光学叉架，跨接两侧护甲。末段轴向退出，为进入裂隙让出通路。'
        : name === 'Stator_Rear'
          ? '偏置的承力脊与背面三角支撑。它连接不同尺度的构件，让展开后的装配关系仍可追踪。'
          : '双轨透镜约束中央的细长能量体。最后一段轴向分离，让裂隙成为可以穿越的入口。';
export function App() {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<CoreExperience | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState(0);
  const [hover, setHover] = useState('');
  const [selected, setSelected] = useState('');
  const [exploded, setExploded] = useState(false);
  const [mechanism, setMechanism] = useState('SEALED / OBSERVE');
  const [low, setLow] = useState(false);
  const [error, setError] = useState('');
  const [help, setHelp] = useState(false);
  const [about, setAbout] = useState(false);
  const [experiment, setExperiment] = useState<number | null>(null);
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const labTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let cancelled = false;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => {
      setReduced(media.matches);
      engine.current?.setReduced(media.matches);
    };
    media.addEventListener('change', change);
    import('./scene/CoreExperience')
      .then(({ CoreExperience }) => {
        if (cancelled || !host.current) return;
        try {
          engine.current = new CoreExperience(
            host.current,
            {
              phase: setPhase,
              progress: setProgress,
              hover: setHover,
              select: setSelected,
              experiment: setExperiment,
              quality: setLow,
              spread: setExploded,
              mechanism: setMechanism,
              error: setError,
            },
            media.matches,
          );
        } catch {
          setPhase('error');
          setError(
            '此浏览器暂时无法建立 WebGL 2 场景。请启用硬件加速或使用支持 WebGL 2 的浏览器。',
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhase('error');
          setError('渲染模块加载失败，请重新加载。');
        }
      });
    return () => {
      cancelled = true;
      engine.current?.dispose();
      media.removeEventListener('change', change);
      void audio.current?.close();
    };
  }, []);
  useEffect(() => {
    if (phase === 'lab') labTitle.current?.focus();
    if (phase === 'core') setExperiment(null);
  }, [phase]);
  useEffect(() => {
    if (!help && !about) return;
    lastFocus.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHelp(false);
        setAbout(false);
      }
      if (e.key === 'Tab') {
        const nodes = modalRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === modalRef.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === modalRef.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      lastFocus.current?.focus();
    };
  }, [help, about]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !help && !about && phase === 'lab') {
        engine.current?.exit();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [phase, help, about]);
  useEffect(() => {
    const visibility = () => {
      if (audio.current) {
        if (document.hidden) void audio.current.suspend();
        else if (sound) void audio.current.resume();
      }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [sound]);
  async function toggleSound() {
    try {
      if (!audio.current) {
        const ctx = new AudioContext();
        audio.current = ctx;
        const volume = ctx.createGain();
        volume.gain.value = 0;
        volume.connect(ctx.destination);
        gain.current = volume;
        [55, 82.41, 110.15].forEach((frequency, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = frequency;
          const level = ctx.createGain();
          level.gain.value = 0.16 / (i + 1);
          osc.connect(level);
          level.connect(volume);
          osc.start();
        });
      }
      await audio.current.resume();
      gain.current!.gain.setTargetAtTime(sound ? 0 : 0.12, audio.current.currentTime, 0.4);
      setSound(!sound);
    } catch {
      setSound(false);
    }
  }
  const inLab = phase === 'lab';
  const moving = phase === 'entering' || phase === 'returning';
  const ready = phase === 'core';
  const currentPart = hover && !hover.startsWith('PORTAL') ? hover : selected;
  return (
    <main className={`experience phase-${phase} ${exploded ? 'is-exploded' : ''}`}>
      <div ref={host} className="scene" data-testid="scene" />
      <div className="film-grain" aria-hidden="true" />
      <header className="masthead">
        <button className="brand" onClick={() => setAbout(true)} aria-label="关于 CREATIVE LAB">
          <span className="brand-mark" aria-hidden="true">
            ⫽
          </span>
          <span>
            CREATIVE
            <br />
            LAB<span className="brand-dot">·</span>
          </span>
        </button>
        <div className="edition">
          <span>INDEPENDENT EXPLORATIONS</span>
          <span>ART, CODE & THE IN-BETWEEN</span>
        </div>
        <button
          className="index-link"
          onClick={() => (inLab ? engine.current?.exit() : setAbout(true))}
        >
          {inLab ? 'BACK TO THE CORE' : 'ABOUT THE LAB'} <span>↗</span>
        </button>
      </header>
      {phase !== 'error' && (
        <>
          <section
            className={`core-editorial ${inLab || moving ? 'concealed' : ''}`}
            aria-hidden={inLab || moving}
          >
            <p className="eyebrow">
              <span className="live-dot" /> EXPERIMENT 001 <span className="rule" /> RIFT / V1.5
            </p>
            <h1>
              THE
              <br />
              <span>CORE</span>
              <sup>①</sup>
            </h1>
            <p className="intro">
              A structure holding an absence.
              <br /> Open it. Find what lies beyond.
            </p>
            <p className="intro-zh">拆开一道边界，进入它所隐藏的空间。</p>
            <div className="edition-note">
              <span>DESIGNED TO BE EXPLORED</span>
              <span>NOT JUST OBSERVED.</span>
            </div>
          </section>
          <aside
            className={`specification ${inLab || moving ? 'concealed' : ''}`}
            aria-hidden={inLab || moving}
          >
            <span className="cross">+</span>
            <p>OBJECT / 001</p>
            <span>RIFT OBSERVATORY</span>
            <span>19 ASSEMBLIES</span>
            <span>ONE THRESHOLD</span>
            <div className="spec-line" />
            <span className="coordinate">
              X — STRUCTURE
              <br />Y — CURIOSITY
              <br />Z — THE UNKNOWN
            </span>
          </aside>
          <div className={`object-label ${inLab || moving ? 'concealed' : ''}`}>
            <span className="target-mark">⊕</span>
            <span>
              {phase === 'awakening' ? 'ESTABLISHING RESONANCE' : mechanism}
              <small>
                {currentPart ? partLabel(currentPart) : 'DRAG TO ORBIT · SCROLL TO APPROACH'}
              </small>
            </span>
          </div>
          {ready && selected && (
            <section className="part-inspector" aria-live="polite">
              <button
                onClick={() => {
                  setSelected('');
                  engine.current?.select('');
                }}
                aria-label="关闭组件说明"
              >
                ×
              </button>
              <span className="eyebrow">COMPONENT / {selected.replaceAll('_', ' ')}</span>
              <h2>{partLabel(selected)}</h2>
              <p>{partInfo(selected)}</p>
            </section>
          )}
          {inLab && (
            <section className="lab-ui">
              <div className="lab-heading">
                <p className="eyebrow">BEYOND THE MACHINE / THE LAB</p>
                <h1 ref={labTitle} tabIndex={-1}>
                  The space
                  <br />
                  <em>between.</em>
                </h1>
                <p>重力止于此处。选择一道裂隙，靠近一个实验。</p>
              </div>
              <nav className="experiment-nav" aria-label="实验空间">
                {experiments.map((ex, i) => (
                  <button
                    key={ex.id}
                    className={experiment === i ? 'active' : ''}
                    aria-pressed={experiment === i}
                    onClick={() => engine.current?.focusExperiment(i)}
                  >
                    <span>
                      {ex.id} <i>↗</i>
                    </span>
                    <strong>{ex.title}</strong>
                    <small>{ex.subtitle}</small>
                  </button>
                ))}
              </nav>
              {experiment !== null && (
                <section className="experiment-detail" aria-live="polite">
                  <button
                    className="close-detail"
                    aria-label="关闭实验说明"
                    onClick={() => { setExperiment(null); engine.current?.overviewLab(); }}
                  >
                    ×
                  </button>
                  <span className="eyebrow">{experiments[experiment].status}</span>
                  <h2>{experiments[experiment].title}</h2>
                  <p>{experiments[experiment].description}</p>
                  {experiment === 0 && (
                    <button className="text-link" onClick={() => engine.current?.exit()}>
                      重新探索 THE CORE ↗
                    </button>
                  )}
                </section>
              )}
            </section>
          )}
          {moving && (
            <div className="transit-caption" aria-live="polite">
              <span>
                {phase === 'entering' ? 'CROSSING THE THRESHOLD' : 'RETURNING TO THE SURFACE'}
              </span>
              <small>{phase === 'entering' ? '由结构，进入可能。' : '让一切重新归位。'}</small>
            </div>
          )}
        </>
      )}
      {phase === 'loading' && (
        <div className="loader" role="status">
          <div className="loader-top">
            <span>ASSEMBLING THE UNKNOWN</span>
            <span>{progress.toString().padStart(2, '0')}%</span>
          </div>
          <div className="load-track">
            <i style={{ width: `${progress}%` }} />
          </div>
          <small>{progress < 90 ? '正在载入机械模型' : '正在编译光影与材质'}</small>
        </div>
      )}
      {phase === 'error' && (
        <section className="fallback">
          <p className="eyebrow">THE CORE / GRAPHICS UNAVAILABLE</p>
          <h1>
            The idea
            <br />
            is still here.
          </h1>
          <p role="alert">{error}</p>
          <button className="primary" onClick={() => location.reload()}>
            重新加载 ↗
          </button>
          <h2>实验目录</h2>
          {experiments.map((ex) => (
            <details key={ex.id}>
              <summary>
                {ex.id} / {ex.title}
              </summary>
              <p>{ex.description}</p>
            </details>
          ))}
        </section>
      )}
      <footer className="control-deck">
        <div className="deck-note">
          <span className="live-dot" />
          {inLab
            ? 'INSIDE THE LAB'
            : moving
              ? 'IN TRANSIT'
              : phase === 'error'
                ? 'GRAPHICS OFFLINE'
                : 'REALTIME / INTERACTIVE'}
          <small>AN OPEN-ENDED EXPERIMENT</small>
        </div>
        <div className="main-controls">
          {inLab ? (
            <button className="secondary" onClick={() => engine.current?.exit()}>
              ↖ 返回核心 <kbd>ESC</kbd>
            </button>
          ) : (
            <>
              <button
                className="secondary"
                disabled={!ready}
                aria-pressed={exploded}
                onClick={() => engine.current?.toggleExplode()}
              >
                <span className="disassembly-icon">{exploded ? '⊕' : '⊞'}</span>
                {exploded ? 'REASSEMBLE' : 'DISASSEMBLE'}
                <small>{exploded ? '重组' : '解构'}</small>
                <kbd>D</kbd>
              </button>
              <button className="primary" disabled={!ready} onClick={() => engine.current?.enter()}>
                ENTER THE CORE <span>↗</span>
                <small>进入核心</small>
              </button>
            </>
          )}
        </div>
        <div className="utility-controls">
          <button
            onClick={() => void toggleSound()}
            aria-pressed={sound}
            aria-label={sound ? '关闭声音' : '开启声音'}
            className="sound-button"
          >
            <span aria-hidden="true">{sound ? '▂▅▃▇▂' : '▂▂▂▂▂'}</span>
            <small>SOUND {sound ? 'ON' : 'OFF'}</small>
          </button>
          <button className="help-button" onClick={() => setHelp(true)} aria-label="操作说明与设置">
            ?
          </button>
        </div>
      </footer>
      <div className="sr-only" aria-live="polite">
        {phase === 'core'
          ? '核心已唤醒，可旋转探索、解构或进入实验室。'
          : inLab
            ? '已进入实验室。'
            : '场景状态：' + phase}
      </div>
      {(help || about) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setHelp(false);
            setAbout(false);
          }}
        >
          <div
            ref={modalRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="关闭"
              onClick={() => {
                setHelp(false);
                setAbout(false);
              }}
            >
              ×
            </button>
            <p className="eyebrow">CREATIVE LAB / FIELD NOTES</p>
            <h2 id="dialog-title">
              {help ? 'Stay curious.' : 'A playground for\nthe not-yet-possible.'}
            </h2>
            {help ? (
              <>
                <p>拖动旋转，滚轮或双指缩放。点击机械组件查看它的结构说明。</p>
                <dl>
                  <div>
                    <dt>方向键</dt>
                    <dd>聚焦三维画布后旋转视角</dd>
                  </div>
                  <div>
                    <dt>D / Enter</dt>
                    <dd>聚焦画布后解构 / 进入核心</dd>
                  </div>
                  <div>
                    <dt>C</dt>
                    <dd>聚焦画布后依次选择机械组件</dd>
                  </div>
                  <div>
                    <dt>R / Escape</dt>
                    <dd>重置视角 / 离开实验室</dd>
                  </div>
                </dl>
                <button
                  className="setting"
                  aria-pressed={low}
                  onClick={() => engine.current?.setQuality(!low)}
                >
                  渲染质量 <span>{low ? 'ECO · 低开销' : 'STUDIO · 完整光效'} ↔</span>
                </button>
                <button
                  className="setting"
                  aria-pressed={reduced}
                  onClick={() => {
                    setReduced(!reduced);
                    engine.current?.setReduced(!reduced);
                  }}
                >
                  减少动态 <span>{reduced ? 'ON' : 'OFF'} ↔</span>
                </button>
                <button
                  className="text-link"
                  disabled={!ready}
                  onClick={() => {
                    engine.current?.resetView();
                    setHelp(false);
                  }}
                >
                  重置观察视角 ↗
                </button>
              </>
            ) : (
              <>
                <p>这里没有标准答案。只有形状、运动、光，以及想知道「接下来会发生什么」的冲动。</p>
                <p>
                  THE CORE
                  是第一件作品：一座约束空间裂隙的机械观测装置。解开锁止、展开护甲，再沿光路进入没有确定重力的内部。你的操作逐层揭开它的结构。
                </p>
                <div className="about-credits">
                  <span>CONCEPT / ORIGINAL MECHANICAL STUDY</span>
                  <span>MEDIUM / REALTIME WEBGL + BLENDER</span>
                  <span>CHAPTER / 001 — THE CORE</span>
                </div>
                <button className="text-link" onClick={() => setAbout(false)}>
                  回到实验 ↗
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
