import { useState } from 'react';
import { readBandColors } from '../stockHeat';
import { type SceneProps } from '../WarehouseVisualizerType';
import { useCursor, Text } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';

const WarehouseScene = ({
  clusters,
  viewMode,
  activeWarehouseKey,
  selectedItemId,
  onSelectWarehouse,
  onSelectItem,
}: SceneProps) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // 재질 색은 CSS 토큰에서 한 번 읽는다(시각화 8). 이 장면은 클라이언트에서만 뜬다(ssr false)
  const [bandColors] = useState(readBandColors);
  useCursor(!!hoveredId, 'pointer', 'auto');

  // Load logo texture for overlay
  const logoTexture = useLoader(TextureLoader, '/images/everp_logo.png');

  const showInterior = viewMode === 'warehouse';
  const visibleClusters =
    showInterior && activeWarehouseKey
      ? clusters.filter((cluster) => cluster.key === activeWarehouseKey)
      : clusters;

  return (
    <>
      <color attach="background" args={['#f4f4f5']} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[18, 18, 10]} intensity={0.8} castShadow shadow-mapSize={1024} />
      <directionalLight position={[-12, 10, -10]} intensity={0.3} />

      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>

        {visibleClusters.map((cluster) => {
          const groupPosition: [number, number, number] =
            showInterior && activeWarehouseKey === cluster.key ? [0, 0, 0] : cluster.origin;

          const floorSize = showInterior ? 16 : 10;
          const wallHeight = 4.5;
          const wallThickness = 0.2;

          return (
            <group key={cluster.key} position={groupPosition}>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.02, 0]}
                receiveShadow
                onClick={(event) => {
                  if (showInterior) return;
                  event.stopPropagation();
                  onSelectWarehouse(cluster.key);
                }}
              >
                <planeGeometry args={[floorSize, floorSize]} />
                <meshStandardMaterial color={showInterior ? '#e0f2fe' : '#bfdbfe'} />
              </mesh>
              {/* 
              <Html position={[0, showInterior ? 3 : 2.2, -(floorSize / 2) + 0.5]} center>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-semibold shadow ${
                    showInterior ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  {cluster.name}
                </div>
              </Html> */}

              {showInterior && (
                <>
                  {/* Front wall */}
                  <mesh position={[0, wallHeight / 2, floorSize / 2]} castShadow receiveShadow>
                    <boxGeometry args={[floorSize, wallHeight, wallThickness]} />
                    <meshStandardMaterial color="#c7d2fe" metalness={0.4} roughness={0.5} />
                  </mesh>
                  {/* Logo overlay on front wall */}
                  <mesh position={[0, 2.2, floorSize / 2 - 0.3]} rotation={[0, Math.PI, 0]}>
                    <planeGeometry args={[3, 1.5]} />
                    <meshBasicMaterial map={logoTexture} transparent opacity={1} color="#ffffff" />
                  </mesh>
                  {/* Back wall */}
                  <mesh position={[0, wallHeight / 2, -floorSize / 2]} castShadow receiveShadow>
                    <boxGeometry args={[floorSize, wallHeight, wallThickness]} />
                    <meshStandardMaterial color="#c7d2fe" metalness={0.4} roughness={0.5} />
                  </mesh>
                  {/* Right wall */}
                  <mesh position={[floorSize / 2, wallHeight / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[wallThickness, wallHeight, floorSize]} />
                    <meshStandardMaterial color="#c7d2fe" metalness={0.4} roughness={0.5} />
                  </mesh>
                  {/* Left wall */}
                  <mesh position={[-floorSize / 2, wallHeight / 2, 0]} castShadow receiveShadow>
                    <boxGeometry args={[wallThickness, wallHeight, floorSize]} />
                    <meshStandardMaterial color="#c7d2fe" metalness={0.4} roughness={0.5} />
                  </mesh>
                  {/* Interior floor */}
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
                    <planeGeometry args={[floorSize - 1.2, floorSize - 1.2]} />
                    <meshStandardMaterial color="#f0f9ff" />
                  </mesh>
                </>
              )}

              {/* Racks and boxes generated based on data */}
              {(() => {
                // Geometry constants
                const rackSpacing = 4;
                const levelsPerRack = 3;
                const boxesPerLevel = 5;
                const numRacks = 4;
                // Use the already built cluster.items for box rendering
                const clusterItems = cluster.items;
                // Render racks (posts and shelves)
                const racks = Array.from({ length: numRacks }).map((_, rackIndex) => {
                  const rackPositionX = (rackIndex - 1.5) * rackSpacing;
                  return (
                    <group key={`rack-${rackIndex}`} position={[rackPositionX, 0, 0]}>
                      {/* rack vertical posts */}
                      {(
                        [
                          [-0.9, 1.2, -5],
                          [0.9, 1.2, -5],
                          [-0.9, 1.2, 5],
                          [0.9, 1.2, 5],
                        ] satisfies [number, number, number][]
                      ).map((pos, i) => (
                        <mesh key={`post-${i}`} position={pos}>
                          <cylinderGeometry args={[0.1, 0.1, 2.4, 8]} />
                          <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.4} />
                        </mesh>
                      ))}
                      {/* rack shelf levels */}
                      {Array.from({ length: levelsPerRack }).map((_, level) => {
                        const shelfY = 0.4 + level * 0.9;
                        return (
                          <mesh
                            key={`shelf-${rackIndex}-${level}`}
                            position={[0, shelfY, 0]}
                            castShadow
                            receiveShadow
                          >
                            <boxGeometry args={[1.8, 0.1, 10]} />
                            <meshStandardMaterial color="#9ca3af" metalness={0.7} roughness={0.3} />
                          </mesh>
                        );
                      })}
                    </group>
                  );
                });
                // Render boxes based on clusterItems
                const boxes = clusterItems.map((item) => {
                  // ShelfNumber-based indexing
                  const maxBoxesPerRack = levelsPerRack * boxesPerLevel; // 15
                  // 블록 자리는 buildCluster 가 선반 번호 순서로 매긴 slot(시각화 8). 겹치지 않는다
                  const shelfNumber = item.slot;
                  const rackIndex = Math.floor(shelfNumber / maxBoxesPerRack);
                  const indexInRack = shelfNumber % maxBoxesPerRack;
                  const level = Math.floor(indexInRack / boxesPerLevel);
                  const boxIndex = indexInRack % boxesPerLevel;
                  // Position calculation
                  const rackPositionX = (rackIndex - 1.5) * rackSpacing;
                  const shelfY = 0.4 + level * 0.9;
                  const boxHeight = 0.8;
                  const y = shelfY + boxHeight / 2 + 0.05;
                  const z = (boxIndex - (boxesPerLevel - 1) / 2) * 2;
                  // Hover logic
                  const isHovered = hoveredId === item.itemId;
                  // Color logic with highlight on hover
                  // 재고율 4단계 색(시각화 8). 고른 품목은 살짝 밝힌다
                  const tone = bandColors[item.band];
                  const color = isHovered ? tone.hover : tone.base;
                  const isSelected = selectedItemId === item.itemId;
                  return (
                    <mesh
                      key={`box-${item.itemId}`}
                      position={[rackPositionX, y, z]}
                      rotation={[0, Math.PI / 2, 0]}
                      castShadow
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectItem(item);
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        onSelectItem(item);
                      }}
                      onPointerOver={() => setHoveredId(item.itemId)}
                      onPointerOut={() => setHoveredId(null)}
                    >
                      <boxGeometry args={[1.2, boxHeight, 1.2]} />
                      <meshStandardMaterial
                        color={color}
                        emissive={isSelected ? '#ffffff' : '#000000'}
                        emissiveIntensity={isSelected ? 0.25 : 0}
                      />
                      <Text
                        position={[0, 0, 0.61]} // move to front toward camera
                        fontSize={0.15}
                        color="black"
                        anchorX="center"
                        anchorY="middle"
                        rotation={[0, 0, 0]} // facing camera
                      >
                        {item.itemName}
                      </Text>
                      <Text
                        position={[0, 0, -0.61]} // move to back face
                        fontSize={0.15}
                        color="black"
                        anchorX="center"
                        anchorY="middle"
                        rotation={[0, Math.PI, 0]} // facing outward from back
                      >
                        {item.itemName}
                      </Text>
                    </mesh>
                  );
                });
                return (
                  <>
                    {racks}
                    {boxes}
                  </>
                );
              })()}
            </group>
          );
        })}
      </group>
    </>
  );
};

export default WarehouseScene;
