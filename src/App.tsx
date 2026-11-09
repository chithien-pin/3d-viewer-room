import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { BootScreen, ErrorScreen } from "./components/BootScreen";
import { ControlHint } from "./components/ControlHint";
import { CatalogPanel, EditHotkeys } from "./components/Editor";
import { Hud } from "./components/Hud";
import { OrbitKnob } from "./components/OrbitKnob";
import { getModel } from "./data/model";
import { Experience } from "./scene/Experience";
import { useLayoutStore } from "./store/useLayoutStore";
import { useRuntimeStore } from "./store/useRuntimeStore";

export default function App() {
  const { model, error } = getModel();
  const title = useLayoutStore((state) => state.apartmentName);
  const ready = useRuntimeStore((state) => state.ready);

  if (error || !model) return <ErrorScreen message={error ?? "Thiếu dữ liệu mặt bằng."} />;

  return (
    <div className="relative h-full w-full touch-none">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 40, near: 0.08, far: 180, position: [8, 12, 16] }}
        gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.05;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <Experience model={model} />
        </Suspense>
      </Canvas>
      <BootScreen ready={ready} title={title} />
      <EditHotkeys />
      <CatalogPanel />
      <Hud zones={model.zones} bounds={model.bounds} />
      <OrbitKnob />
      <ControlHint />
    </div>
  );
}
