import { useState } from 'react';
import { Metronome } from './features/metronome/Metronome';
import { ChordDrone } from './features/chordDrone/ChordDrone';
import { ChordLoop } from './features/chordLoop/ChordLoop';
import { ListenRepeat } from './features/listenRepeat/ListenRepeat';
import './App.css';

type ViewId = 'metronome' | 'drone' | 'loop' | 'listen';

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'metronome', label: 'Metronome' },
  { id: 'drone', label: 'Chord Drone' },
  { id: 'loop', label: 'Chord Loop' },
  { id: 'listen', label: 'Listen & Repeat' },
];

function App() {
  const [view, setView] = useState<ViewId>('metronome');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Music Practice Tools</h1>
        <nav className="app-nav" aria-label="Tools">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className={'nav-item' + (view === v.id ? ' active' : '')}
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {view === 'metronome' && <Metronome />}
        {view === 'drone' && <ChordDrone />}
        {view === 'loop' && <ChordLoop />}
        {view === 'listen' && <ListenRepeat />}
      </main>
    </div>
  );
}

export default App;
