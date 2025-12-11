export const categorizeTransaction = (merchant) => {
  const m = merchant.toLowerCase();
  if (m.includes('uber') || m.includes('ola') || m.includes('fuel') || m.includes('petrol')) return 'Transport';
  if (m.includes('swiggy') || m.includes('zomato') || m.includes('burger') || m.includes('pizza') || m.includes('cafe')) return 'Food';
  if (m.includes('grocery') || m.includes('mart') || m.includes('basket') || m.includes('super')) return 'Groceries';
  if (m.includes('netflix') || m.includes('spotify') || m.includes('movie') || m.includes('cinema')) return 'Entertainment';
  if (m.includes('pharmacy') || m.includes('med') || m.includes('hospital') || m.includes('clinic')) return 'Health';
  if (m.includes('salary') || m.includes('interest') || m.includes('refund')) return 'Income';
  return 'General';
};

export const parseSMS = (text) => {
  // 1. Updated Amount Regex: Now accepts 'Rs:', 'Rs.', 'INR:', etc.
  //    [:\s]* allows for optional colons or spaces between currency and amount
  const amountRegex = /(?:Rs\.?|INR|₹|\$|GBP|USD|EUR)[\s:]*([\d,]+(?:\.\d{1,2})?)/i;
  
  // 2. Updated Merchant Regex: Added 'by' to capture things like "by Mob Bk"
  const merchantRegex = /(?:at|to|info|vp|by)\s+([A-Za-z0-9\s\.\*]+?)(?=\s+(?:on|ref|bal|avbl)|$)/i;
  
  const typeRegex = /(debited|spent|purchase|sent|paid)/i;
  
  const amountMatch = text.match(amountRegex);
  const merchantMatch = text.match(merchantRegex);

  if (amountMatch) {
    const rawAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
    const isCredit = text.toLowerCase().includes('credited') || text.toLowerCase().includes('received');
    const finalType = isCredit ? 'income' : 'expense';
    
    // Clean up merchant name
    let merchant = merchantMatch ? merchantMatch[1].trim() : 'Unknown Merchant';
    merchant = merchant.replace(/ ending with.*/, '').trim();

    return {
      amount: rawAmount,
      merchant: merchant,
      category: categorizeTransaction(merchant),
      type: finalType,
      originalText: text,
      timestamp: new Date().toISOString()
    };
  }
  return null;
};