import { InventoryResponse } from '@/app/(private)/inventory/types/InventoryListType';
import { VisualizerItem, WarehouseCluster, WarehouseFilter } from './WarehouseVisualizerType';

export const SAMPLE_INVENTORY: InventoryResponse[] = [
  {
    itemId: 'SAMPLE-1',
    itemNumber: 'SMPL-001',
    itemName: 'PCB 모듈 A',
    category: '전자',
    currentStock: 120,
    forShipmentStock: 20,
    reservedStock: 30,
    safetyStock: 80,
    uomName: 'EA',
    unitPrice: 1800,
    totalAmount: 216000,
    warehouseName: '중앙 창고 1',
    warehouseType: 'MAIN',
    statusCode: 'NORMAL',
    shelfNumber: 1,
  },
  {
    itemId: 'SAMPLE-2',
    itemNumber: 'SMPL-002',
    itemName: '알루미늄 프레임',
    category: '금속',
    currentStock: 45,
    forShipmentStock: 20,
    reservedStock: 30,
    safetyStock: 60,
    uomName: 'EA',
    unitPrice: 5200,
    totalAmount: 234000,
    warehouseName: '중앙 창고 1',
    warehouseType: 'MAIN',
    statusCode: 'LOW',
    shelfNumber: 2,
  },
  {
    itemId: 'SAMPLE-3',
    itemNumber: 'SMPL-003',
    itemName: '패키징 박스',
    category: '자재',
    currentStock: 310,
    forShipmentStock: 20,
    reservedStock: 30,
    safetyStock: 250,
    uomName: 'EA',
    unitPrice: 350,
    totalAmount: 108500,
    warehouseName: '패키징 존',
    warehouseType: 'SUB',
    statusCode: 'NORMAL',
    shelfNumber: 3,
  },
  {
    itemId: 'SAMPLE-4',
    itemNumber: 'SMPL-004',
    itemName: '고무 패킹',
    category: '소모품',
    currentStock: 20,
    forShipmentStock: 20,
    reservedStock: 30,
    safetyStock: 40,
    uomName: 'EA',
    unitPrice: 900,
    totalAmount: 18000,
    warehouseName: '보조 창고',
    warehouseType: 'SUB',
    statusCode: 'LOW',
    shelfNumber: 4,
  },
  {
    itemId: 'SAMPLE-5',
    itemNumber: 'SMPL-005',
    itemName: '커넥터 세트',
    category: '전자',
    currentStock: 95,
    forShipmentStock: 20,
    reservedStock: 30,
    safetyStock: 70,
    uomName: 'EA',
    unitPrice: 2600,
    totalAmount: 247000,
    warehouseName: '보조 창고',
    warehouseType: 'SUB',
    statusCode: 'NORMAL',
    shelfNumber: 5,
  },
  {
    itemId: 'SAMPLE-6',
    itemNumber: 'SMPL-006',
    itemName: '볼트 세트',
    category: '기계',
    currentStock: 420,
    forShipmentStock: 20,
    reservedStock: 30,
    safetyStock: 300,
    uomName: 'EA',
    unitPrice: 140,
    totalAmount: 58800,
    warehouseName: '중앙 창고 1',
    warehouseType: 'MAIN',
    statusCode: 'NORMAL',
    shelfNumber: 6,
  },
  {
    itemId: 'SAMPLE-7',
    itemNumber: 'SMPL-007',
    itemName: '플라스틱 커버',
    category: '자재',
    currentStock: 65,
    forShipmentStock: 20,
    reservedStock: 30,
    safetyStock: 120,
    uomName: 'EA',
    unitPrice: 480,
    totalAmount: 31200,
    warehouseName: '패키징 존',
    warehouseType: 'SUB',
    statusCode: 'LOW',
    shelfNumber: 7,
  },
  {
    itemId: 'SAMPLE-8',
    itemNumber: 'SMPL-008',
    itemName: '강철 브라켓',
    category: '금속',
    currentStock: 150,
    forShipmentStock: 20,
    reservedStock: 30,
    safetyStock: 120,
    uomName: 'EA',
    unitPrice: 1200,
    totalAmount: 180000,
    warehouseName: '중앙 창고 1',
    warehouseType: 'MAIN',
    statusCode: 'NORMAL',
    shelfNumber: 8,
  },
];

export const buildCluster = (
  source: InventoryResponse[],
  options?: WarehouseFilter,
): WarehouseCluster[] => {
  if (source.length === 0) {
    return [
      {
        key: options?.warehouseId ?? 'no-data',
        name: options?.warehouseName ?? '미지정 창고',
        origin: [0, 0, 0],
        items: [],
      },
    ];
  }

  const displayName = options?.warehouseName ?? source[0].warehouseName ?? '미지정 창고';
  const clusterKey = options?.warehouseId ?? displayName;

  const racks = new Map<number, InventoryResponse[]>();
  for (const item of source) {
    const shelf = item.shelfNumber ?? 1;
    const rack = racks.get(shelf);
    if (rack) rack.push(item);
    else racks.set(shelf, [item]);
  }

  const items: VisualizerItem[] = [];
  let rackIndex = 0;
  for (const rackItems of racks.values()) {
    const rackOffsetX = (rackIndex - (racks.size - 1) / 2) * 4;
    rackItems.forEach((item, i) => {
      const level = Math.floor(i / 5);
      const slot = i % 5;
      const offsetZ = (slot - 2) * 2;
      const offsetY = 0.4 + level * 1.2;
      const safety = item.safetyStock || 1;
      const fillRatio = item.currentStock / safety;

      items.push({
        ...item,
        warehouseKey: clusterKey,
        localPosition: [rackOffsetX, offsetY, offsetZ],
        level,
        fillRatio: Math.max(fillRatio, 0),
        isLowStock: item.currentStock < safety,
      });
    });
    rackIndex++;
  }

  return [
    {
      key: clusterKey,
      name: displayName,
      origin: [0, 0, 0],
      items,
    },
  ];
};

// 창고 재고 요약 정보 처리 로직
export const summarizeClusters = (clusters: WarehouseCluster[]) => {
  return clusters.map((cluster) => {
    const totalItems = cluster.items.length;
    const totalQty = cluster.items.reduce((acc, item) => acc + item.currentStock, 0);
    const lowStock = cluster.items.filter((item) => item.isLowStock).length;
    const avgFill =
      cluster.items.reduce((acc, item) => acc + Math.min(item.fillRatio, 1), 0) / (totalItems || 1);

    return {
      key: cluster.key,
      name: cluster.name,
      totalItems,
      totalQty,
      lowStock,
      avgFillPercent: Math.round(avgFill * 100),
    };
  });
};
