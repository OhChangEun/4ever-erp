'use client';

import {
  QuoteStatus,
  Quote,
  QuoteFormData,
  QuoteFormItem,
} from '@/app/(private)/sales/types/SalesQuoteListType';
import { useState } from 'react';
import { NewQuoteModalProps } from '@/app/(private)/sales/types/NewQuoteModalType';
import { NEW_QUOTE_PRODUCT_TABLE_HEADERS } from '@/app/(private)/sales/constant';

const NewQuoteModal = ({ $showNewQuoteModal, $setShowNewQuoteModal }: NewQuoteModalProps) => {
  const [newQuoteData, setNewQuoteData] = useState<QuoteFormData>({
    customer: '',
    customerContact: '',
    customerEmail: '',
    quoteDate: new Date().toISOString().split('T')[0],
    validUntil: '',
    items: [
      {
        id: 1,
        product: '',
        specification: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ],
    totalAmount: 0,
    notes: '',
    paymentTerms: '30일 후 결제',
    deliveryTerms: 'FOB 공장도',
    warranty: '1년',
  });

  const handleNewQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const quoteNumber = `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000) + 1).padStart(3, '0')}`;

    alert(
      `신규 견적서가 성공적으로 작성되었습니다!\n견적번호: ${quoteNumber}\n고객: ${newQuoteData.customer}\n총 금액: ₩${newQuoteData.totalAmount.toLocaleString()}`,
    );

    $setShowNewQuoteModal(false);
    setNewQuoteData({
      customer: '',
      customerContact: '',
      customerEmail: '',
      quoteDate: new Date().toISOString().split('T')[0],
      validUntil: '',

      items: [
        {
          id: 1,
          product: '',
          specification: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
        },
      ],
      totalAmount: 0,
      notes: '',
      paymentTerms: '30일 후 결제',
      deliveryTerms: 'FOB 공장도',
      warranty: '1년',
    });
  };

  const updateQuoteData = <K extends keyof QuoteFormData>(field: K, value: QuoteFormData[K]) => {
    setNewQuoteData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateQuoteItem = <K extends keyof QuoteFormItem>(
    itemId: number,
    field: K,
    value: QuoteFormItem[K],
  ) => {
    setNewQuoteData((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        const nextItem: QuoteFormItem = { ...item, [field]: value } as QuoteFormItem;
        if (field === 'quantity' || field === 'unitPrice') {
          const quantity = field === 'quantity' ? (value as number) : nextItem.quantity;
          const unitPrice = field === 'unitPrice' ? (value as number) : nextItem.unitPrice;
          nextItem.totalPrice = quantity * unitPrice;
        }
        return nextItem;
      });

      const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);

      return {
        ...prev,
        items: updatedItems,
        totalAmount,
      };
    });
  };

  const addQuoteItem = () => {
    setNewQuoteData((prev) => {
      const nextId = prev.items.length ? Math.max(...prev.items.map((item) => item.id)) + 1 : 1;
      const newItem: QuoteFormItem = {
        id: nextId,
        product: '',
        specification: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      };
      return {
        ...prev,
        items: [...prev.items, newItem],
      };
    });
  };

  const removeQuoteItem = (itemId: number) => {
    setNewQuoteData((prev) => {
      if (prev.items.length <= 1) {
        return prev;
      }
      const items = prev.items.filter((item) => item.id !== itemId);
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      return {
        ...prev,
        items,
        totalAmount,
      };
    });
  };
  return (
    <>
      {/* 신규 견적서 작성 모달 */}
      {$showNewQuoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-overlay">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">견적서 작성</h3>
              <button
                onClick={() => $setShowNewQuoteModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleNewQuoteSubmit} className="space-y-6">
              {/* 고객 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">고객 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">고객명 *</label>
                    <input
                      type="text"
                      value={newQuoteData.customer}
                      onChange={(e) => updateQuoteData('customer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                      placeholder="고객명을 입력하세요"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
                    <input
                      type="text"
                      value={newQuoteData.customerContact}
                      onChange={(e) => updateQuoteData('customerContact', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                      placeholder="담당자명을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                    <input
                      type="email"
                      value={newQuoteData.customerEmail}
                      onChange={(e) => updateQuoteData('customerEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                      placeholder="이메일을 입력하세요"
                    />
                  </div>
                </div>
              </div>

              {/* 견적 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">견적 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      견적일자 *
                    </label>
                    <input
                      type="date"
                      value={newQuoteData.quoteDate}
                      onChange={(e) => updateQuoteData('quoteDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      요청 납기 일자
                    </label>
                    <input
                      type="date"
                      value={newQuoteData.validUntil}
                      onChange={(e) => updateQuoteData('validUntil', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 견적 품목 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">견적 품목</h4>
                  <button
                    type="button"
                    onClick={addQuoteItem}
                    className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
                  >
                    <i className="ri-add-line"></i>
                    <span className="mt-0.5">품목 추가</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg table-fixed">
                    <colgroup>
                      <col className="w-[25%]" />
                      <col className="w-[25%]" />
                      <col className="w-[10%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                      <col className="w-[10%]" />
                    </colgroup>
                    <thead className="bg-gray-50">
                      <tr>
                        {NEW_QUOTE_PRODUCT_TABLE_HEADERS.map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-sm font-medium text-gray-700 border-b border-gray-200 text-center"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {newQuoteData.items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-200 ">
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.product}
                              onChange={(e) => updateQuoteItem(item.id, 'product', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="제품명"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={item.specification}
                              onChange={(e) =>
                                updateQuoteItem(item.id, 'specification', e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="사양"
                            />
                          </td>
                          <td className="px-0 py-3">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuoteItem(item.id, 'quantity', Number(e.target.value))
                              }
                              className="w-15 px-0 py-1 border border-gray-300 rounded text-sm text-center ml-4"
                              min="1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateQuoteItem(item.id, 'unitPrice', Number(e.target.value))
                              }
                              className="w-24 py-1 border border-gray-300 rounded text-sm text-right ml-9"
                              min="0"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            ₩{item.totalPrice.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeQuoteItem(item.id)}
                              disabled={newQuoteData.items.length <= 1}
                              className={`${
                                newQuoteData.items.length <= 1
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-red-600 hover:text-red-800 cursor-pointer'
                              }`}
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right font-medium text-gray-900">
                          총 견적금액
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-lg text-blue-600">
                          ₩{newQuoteData.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 비고 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비고</label>
                <textarea
                  value={newQuoteData.notes}
                  onChange={(e) => updateQuoteData('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  rows={3}
                  placeholder="추가 요청사항이나 특이사항을 입력하세요"
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => $setShowNewQuoteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer whitespace-nowrap"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-blue-600 transition-colors font-medium cursor-pointer whitespace-nowrap"
                >
                  견적서 작성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default NewQuoteModal;
