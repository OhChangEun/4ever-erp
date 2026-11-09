import React, { useMemo } from 'react';
import { buildBomTree } from './utils/buildBomTree';
import D3TreeChart from './D3TreeChart';
import type { BomLevelStructureNode } from './types/BomDetailApiType';

interface BomTreeContainerProps {
  bomData: BomLevelStructureNode[];
}

const BomTreeContainer: React.FC<BomTreeContainerProps> = ({ bomData }) => {
  // 변환은 순수 계산이라 렌더 중에 한다. bomData 가 바뀔 때만 다시 계산한다
  const { treeData, error } = useMemo(() => buildBomTree(bomData ?? []), [bomData]);

  if (error) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-600">BOM 데이터가 없습니다.</p>
      </div>
    );
  }

  return <D3TreeChart data={treeData} width={1000} height={600} />;
};

export default BomTreeContainer;
