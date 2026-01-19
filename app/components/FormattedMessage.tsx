import React from 'react';

interface FormattedMessageProps {
  content: string;
}

export default function FormattedMessage({ content }: FormattedMessageProps) {
  // Ported from widget.js processMarkdownAndLinks
  const processMarkdownAndLinks = (text: string) => {
    let processedText = text;
    
    // Handle literal \n characters
    processedText = processedText.replace(/\\n/g, '\n');
    
    // Product Cards - Extract data to JSON and rebuild HTML
    const productCardRegex = /\[PRODUCT_CARD\]([\s\S]*?)\[\/PRODUCT_CARD\]/g;
    processedText = processedText.replace(productCardRegex, (match, cardData) => {
        try {
            const card = JSON.parse(cardData.trim());
            return createProductCard(card);
        } catch (e) {
            console.warn('Failed to parse product card:', e);
            return match;
        }
    });

    // Link Cards
    const linkCardRegex = /\[LINK_CARD\]([\s\S]*?)\[\/LINK_CARD\]/g;
    processedText = processedText.replace(linkCardRegex, (match, cardData) => {
        try {
            const card = JSON.parse(cardData.trim());
            return createLinkCard(card);
        } catch (e) {
            console.warn('Failed to parse link card:', e);
            return match;
        }
    });

    // Handle markdown links FIRST
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-500 hover:underline">$1</a>');
    
    // Handle headings
    processedText = processedText.replace(/^### (.*$)/gm, '<h3 class="font-semibold text-lg my-2">$1</h3>');
    processedText = processedText.replace(/^## (.*$)/gm, '<h2 class="font-semibold text-xl my-2">$1</h2>');
    processedText = processedText.replace(/^# (.*$)/gm, '<h1 class="font-bold text-2xl my-3">$1</h1>');
    
    // Handle bold and italic
    processedText = processedText.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedText = processedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle code blocks
    processedText = processedText.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto my-2"><code>$1</code></pre>');
    processedText = processedText.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded font-mono text-sm">$1</code>');
    
    // Handle blockquotes
    processedText = processedText.replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-gray-300 pl-3 my-2 italic text-gray-600">$1</blockquote>');
    
    // Lists and Paragraphs
    const lines = processedText.split('\n');
    let inList = false;
    let inOrderedList = false;
    let result: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (!line && (inList || inOrderedList)) {
            continue;
        }
        
        // Unordered lists
        if (line.match(/^[\*\-\+]\s+(.+)/)) {
            const content = line.replace(/^[\*\-\+]\s+/, '');
            if (!inList) {
                if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
                result.push('<ul class="list-disc pl-6 my-2 space-y-1">');
                inList = true;
            }
            result.push(`<li>${content}</li>`);
        }
        // Ordered lists
        else if (line.match(/^\d+\.\s+(.+)/)) {
            const content = line.replace(/^\d+\.\s+/, '');
            if (!inOrderedList) {
                if (inList) { result.push('</ul>'); inList = false; }
                result.push('<ol class="list-decimal pl-6 my-2 space-y-1">');
                inOrderedList = true;
            }
            result.push(`<li>${content}</li>`);
        }
        else {
            if (inList) { result.push('</ul>'); inList = false; }
            if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
            
            if (line) {
                if (!line.match(/^<(h[1-6]|blockquote|div|ul|ol|li|pre)/)) {
                    result.push(`<p class="mb-2 last:mb-0">${line}</p>`);
                } else {
                    result.push(line);
                }
            }
        }
    }
    
    if (inList) result.push('</ul>');
    if (inOrderedList) result.push('</ol>');
    
    processedText = result.join('');
    
    // Handle standalone URLs
    const parts = processedText.split(/(<a[^>]*>.*?<\/a>)/g);
    processedText = parts.map((part, index) => {
        if (index % 2 === 0) {
            return part.replace(/(^|[\s(<>])((https?:\/\/)[^\s<>"']+)/g, (match, prefix, url) => {
                const cleanUrl = url.replace(/[.,;!?]+$/, '');
                return prefix + `<a href="${cleanUrl}" target="_blank" class="text-blue-500 hover:underline">${cleanUrl}</a>`;
            });
        }
        return part;
    }).join('');

    return processedText;
  };

  const createProductCard = (cardData: any) => {
    const {
        title = 'Product',
        description = '',
        price = '',
        image = '',
        url = '#',
        availability = '',
        rating = ''
    } = cardData;

    const hasMeta = availability || rating;
    const imageHtml = image ? `
      <div class="flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-gray-100">
        <img src="${image}" alt="${title}" class="w-full h-full object-cover" onerror="this.style.display='none';">
      </div>
    ` : '';
    
    const truncatedDescription = description && description.length > 80 
        ? description.substring(0, 80) + '...' 
        : description;

    return `
      <div class="bg-white border text-gray-800 border-gray-200 rounded-xl p-3 mt-2 hover:border-blue-500 hover:shadow-sm transition-all">
        <div class="flex gap-3 mb-3">
          ${imageHtml}
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-gray-900 m-0 mb-1 truncate">${title}</h4>
            ${truncatedDescription ? `<p class="text-xs text-gray-600 line-clamp-2">${truncatedDescription}</p>` : ''}
            ${price ? `<p class="text-sm font-bold text-green-600 mt-1">${price}</p>` : ''}
          </div>
        </div>
        ${hasMeta ? `
          <div class="flex items-center gap-2 mb-2 text-xs text-gray-600">
            ${availability ? `<span>${availability}</span>` : ''}
            ${rating ? `<span>⭐ ${rating}</span>` : ''}
          </div>
        ` : ''}
        <a href="${url}" target="_blank" class="block w-full text-center bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-xs font-medium hover:bg-blue-600 hover:text-white transition-colors no-underline">
          View Product
        </a>
      </div>
    `;
  };

  const createLinkCard = (cardData: any) => {
    const {
        title = 'Page',
        description = '',
        url = '#',
        image = ''
    } = cardData;
    
    const imageHtml = image ? `
      <div class="flex-shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-gray-100">
        <img src="${image}" alt="${title}" class="w-full h-full object-cover" onerror="this.style.display='none';">
      </div>
    ` : '';
    
    const truncatedDescription = description && description.length > 80 
        ? description.substring(0, 80) + '...' 
        : description;

    return `
      <div class="bg-white border border-gray-200 rounded-xl p-3 mt-2 hover:border-blue-500 hover:shadow-sm transition-all">
        <div class="flex gap-3 mb-3">
          ${imageHtml}
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-gray-900 m-0 mb-1 truncate">${title}</h4>
            ${truncatedDescription ? `<p class="text-xs text-gray-600 line-clamp-2">${truncatedDescription}</p>` : ''}
          </div>
        </div>
        <a href="${url}" target="_blank" class="block w-full text-center bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-xs font-medium hover:bg-blue-600 hover:text-white transition-colors no-underline">
          Visit Page ↗
        </a>
      </div>
    `;
  };

  return (
    <div 
      className="text-sm text-gray-800 leading-relaxed break-words"
      dangerouslySetInnerHTML={{ __html: processMarkdownAndLinks(content) }}
    />
  );
}
