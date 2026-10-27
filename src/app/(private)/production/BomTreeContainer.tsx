import React, { useState, useEffect } from 'react';
import { BomApiNode, transformBomDataToTree, TreeNode } from './utils/bomTreeUtils';
import D3TreeChart from './D3TreeChart';
import { BomLevelStructureNode } from './types/BomDetailApiType';

interface BomTreeContainerProps {
  bomData: BomLevelStructureNode[];
}

const BomTreeContainer: React.FC<BomTreeContainerProps> = ({ bomData }) => {
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processBomData = (): void => {
      try {
        setLoading(true);

        // BomLevelStructureNode[]를 BomApiNode[] 형태로 변환
        const bomApiData: BomApiNode[] = bomData.map((node: BomLevelStructureNode): BomApiNode => ({
          id: node.id,
          code: node.code,
          name: node.name,
          quantity: node.quantity || undefined,
          unit: node.unit || undefined,
          level: node.level,
          parentId: node.parentId || undefined,
        }));

        // 데이터를 트리 구조로 변환
        const transformedData: TreeNode | null = transformBomDataToTree(bomApiData);

        // null 체크
        if (!transformedData) {
          setError('BOM 데이터를 트리 구조로 변환할 수 없습니다.');
          setTreeData(null);
          return;
        }

        setTreeData(transformedData);
        setError(null);
      } catch (err) {
        setError('BOM 데이터를 처리하는데 실패했습니다.');
        console.error('BOM 데이터 처리 오류:', err);
      } finally {
        setLoading(false);
      }
    };

    if (bomData && bomData.length > 0) {
      processBomData();
    } else {
      setLoading(false);
    }
  }, [bomData]);

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">BOM 구조를 불러오는 중...</p>
        </div>
      </div>
    );
  }

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
