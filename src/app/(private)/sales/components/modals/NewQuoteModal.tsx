'use client';

import {
  type QuoteFormData,
  type QuoteFormItem,
} from '@/app/(private)/sales/types/SalesQuoteListType';
import { useState, useId } from 'react';
import { type NewQuoteModalProps } from '@/app/(private)/sales/types/NewQuoteModalType';
import { NEW_QUOTE_PRODUCT_TABLE_HEADERS } from '@/app/(private)/sales/constant';
import { useToast } from '@/app/components/common/toast/useToast';

import { formatCurrency } from '@/app/utils/number';
import { toDateKey } from '@/app/utils/date';
import { useTranslations } from 'next-intl';

// 빈 견적서 폼. 처음 열 때와 작성 뒤 비울 때 같이 쓴다.
// 결제, 인도, 보증 조건은 화면에 안 보이는 견적 데이터 기본값이라 번역하지 않는다(i18n 8)
const emptyQuoteForm = (): QuoteFormData => ({
  customer: '',
  customerContact: '',
  customerEmail: '',
  quoteDate: toDateKey(new Date()),
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

const NewQuoteModal = ({ showNewQuoteModal, setShowNewQuoteModal }: NewQuoteModalProps) => {
  // 라벨과 입력을 잇는 id(접근성 2 카드). 같은 모달이 두 번 떠도 겹치지 않게 useId
  const fieldId = useId();
  const t = useTranslations('sales.newQuote');
  const tc = useTranslations('sales.common');
  const [newQuoteData, setNewQuoteData] = useState<QuoteFormData>(emptyQuoteForm);
  const toast = useToast();

  const handleNewQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const quoteNumber = `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000) + 1).padStart(3, '0')}`;

    toast.success(t('success', { number: quoteNumber }));

    setShowNewQuoteModal(false);
    setNewQuoteData(emptyQuoteForm());
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
        const nextItem: QuoteFormItem = { ...item };
        nextItem[field] = value;
        if (field === 'quantity' || field === 'unitPrice') {
          nextItem.totalPrice = nextItem.quantity * nextItem.unitPrice;
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
      {showNewQuoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-overlay">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">{t('title')}</h3>
              <button
                onClick={() => setShowNewQuoteModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleNewQuoteSubmit} className="space-y-6">
              {/* 고객 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">{t('customerTitle')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor={`${fieldId}-field0`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t('customerName')}
                    </label>
                    <input
                      id={`${fieldId}-field0`}
                      type="text"
                      value={newQuoteData.customer}
                      onChange={(e) => updateQuoteData('customer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                      placeholder={t('customerNamePlaceholder')}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${fieldId}-field1`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t('manager')}
                    </label>
                    <input
                      id={`${fieldId}-field1`}
                      type="text"
                      value={newQuoteData.customerContact}
                      onChange={(e) => updateQuoteData('customerContact', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                      placeholder={t('managerPlaceholder')}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${fieldId}-field2`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t('email')}
                    </label>
                    <input
                      id={`${fieldId}-field2`}
                      type="email"
                      value={newQuoteData.customerEmail}
                      onChange={(e) => updateQuoteData('customerEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                      placeholder={t('emailPlaceholder')}
                    />
                  </div>
                </div>
              </div>

              {/* 견적 정보 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">{t('quoteTitle')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor={`${fieldId}-field3`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t('quoteDate')}
                    </label>
                    <input
                      id={`${fieldId}-field3`}
                      type="date"
                      value={newQuoteData.quoteDate}
                      onChange={(e) => updateQuoteData('quoteDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${fieldId}-field4`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {t('dueDate')}
                    </label>
                    <input
                      id={`${fieldId}-field4`}
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
                  <h4 className="text-lg font-medium text-gray-900">{t('itemsTitle')}</h4>
                  <button
                    type="button"
                    onClick={addQuoteItem}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer whitespace-nowrap flex items-center space-x-2"
                  >
                    <i className="ri-add-line"></i>
                    <span className="mt-0.5">{t('addItem')}</span>
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
                            {t(`columns.${header}`)}
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
                              placeholder={t('productPlaceholder')}
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
                              placeholder={t('specPlaceholder')}
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
                            {formatCurrency(item.totalPrice)}
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
                          {t('total')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-lg text-blue-600">
                          {formatCurrency(newQuoteData.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 비고 */}
              <div>
                <label
                  htmlFor={`${fieldId}-field5`}
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {tc('note')}
                </label>
                <textarea
                  id={`${fieldId}-field5`}
                  value={newQuoteData.notes}
                  onChange={(e) => updateQuoteData('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  rows={3}
                  placeholder={tc('requestNotePlaceholder')}
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewQuoteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer whitespace-nowrap"
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium cursor-pointer whitespace-nowrap"
                >
                  {t('submit')}
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
