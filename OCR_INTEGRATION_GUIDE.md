# OCR Integration Guide for PettyCash Receipt Processing

## Current Integration Point

The OCR functionality is integrated in `client/src/pages/PettyCash.tsx` in the `processImageWithOCR` function (around line 530).

## Required OCR Output Format

Your OCR solution needs to extract text from payment screenshots and return data that can populate these form fields:

```typescript
interface ExpectedOCRData {
  amount: string;        // Transaction amount (e.g., "500", "1200")
  paidTo: string;        // Recipient/business name
  purpose: string;       // Description/purpose of payment
  date: string;          // Date in YYYY-MM-DD format
}
```

## Integration Steps

1. **Replace the `processImageWithOCR` function** in `client/src/pages/PettyCash.tsx`
2. **Your function should:**
   - Take a `File` object as input
   - Extract text using your chosen OCR solution
   - Parse the text to extract payment details
   - Update the form with extracted data

## Example Integration Pattern

```typescript
const processImageWithOCR = async (file: File) => {
  setIsProcessingOCR(true);
  
  try {
    // YOUR OCR SOLUTION HERE
    // const text = await yourOCRService.extractText(file);
    
    // Parse extracted text for payment details
    const extractedData = {
      amount: '', // Extract transaction amount
      paidTo: '', // Extract recipient name
      purpose: '', // Extract payment description
      date: ''    // Extract date
    };
    
    // Update the form with extracted data
    setFormData(prev => ({
      ...prev,
      ...extractedData
    }));
    
    toast({ 
      title: "Payment details extracted", 
      description: "Review and submit the expense" 
    });
  } catch (error) {
    toast({ 
      title: "OCR processing failed", 
      description: "Please fill details manually", 
      variant: "destructive" 
    });
  }
  
  setIsProcessingOCR(false);
};
```

## Key Requirements for Your OCR Solution

### 1. **Amount Extraction**
- Must distinguish transaction amounts from transaction IDs
- Handle Indian rupee formats (₹500, Rs.500, 500)
- Avoid extracting dates/years as amounts

### 2. **Platform Support**
- Google Pay (GPay)
- PhonePe  
- Paytm
- CRED
- Bank transfer screenshots

### 3. **Text Parsing Logic**
- Skip transaction IDs (long numbers like 109214778705)
- Skip date fragments when looking for amounts
- Prioritize ₹ symbol amounts over standalone numbers

## Current Form State Integration

The OCR function updates the form using:
```typescript
setFormData(prev => ({
  ...prev,
  amount: extractedAmount,
  paidTo: extractedRecipient,
  purpose: extractedPurpose,
  date: extractedDate
}));
```

## Testing

Test with various payment screenshots to ensure:
- Correct amount extraction (avoiding transaction IDs)
- Proper recipient name identification
- Meaningful purpose/description extraction
- Accurate date parsing

## File Upload Flow

The OCR is automatically triggered when users:
1. Upload image files via file input
2. Drag and drop image files
3. The `processFile` function calls `processImageWithOCR` for image files

Your OCR solution will integrate seamlessly into this existing workflow.