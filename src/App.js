import React from 'react';
import LeftToolbar from './components/LeftToolbar';
import CanvasGrid from './components/CanvasGrid';
import { EditorProvider } from './context/EditorContext';
import WallSettingsPanel from './components/WallSettingsPanel';

function App() {
  return (
    <EditorProvider>
      <div style={{ display: 'flex', height: '100vh' }}>
        <LeftToolbar />
        <CanvasGrid />
        <WallSettingsPanel />
      </div>
    </EditorProvider>
  );
}

export default App;

