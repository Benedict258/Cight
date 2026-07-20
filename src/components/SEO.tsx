import { useEffect, useRef } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  image?: string;
}

export default function SEO({ title, description, keywords, image }: SEOProps) {
  const createdElements = useRef<Element[]>([]);

  useEffect(() => {
    createdElements.current = [];

    // Dynamic page title
    const fullTitle = title.includes('CIGHT') ? title : `${title} | CIGHT`;
    document.title = fullTitle;

    // Dynamic description meta tag
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
        createdElements.current.push(metaDescription);
      }
      metaDescription.setAttribute('content', description);

      let ogDescription = document.querySelector('meta[property="og:description"]');
      if (!ogDescription) {
        ogDescription = document.createElement('meta');
        ogDescription.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescription);
        createdElements.current.push(ogDescription);
      }
      ogDescription.setAttribute('content', description);

      let twitterDescription = document.querySelector('meta[property="twitter:description"]');
      if (!twitterDescription) {
        twitterDescription = document.createElement('meta');
        twitterDescription.setAttribute('property', 'twitter:description');
        document.head.appendChild(twitterDescription);
        createdElements.current.push(twitterDescription);
      }
      twitterDescription.setAttribute('content', description);
    }

    // Dynamic keywords meta tag
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
        createdElements.current.push(metaKeywords);
      }
      metaKeywords.setAttribute('content', keywords);
    }

    // Dynamic og:image / twitter:image
    if (image) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        document.head.appendChild(ogImage);
        createdElements.current.push(ogImage);
      }
      ogImage.setAttribute('content', image);

      let twitterImage = document.querySelector('meta[property="twitter:image"]');
      if (!twitterImage) {
        twitterImage = document.createElement('meta');
        twitterImage.setAttribute('property', 'twitter:image');
        document.head.appendChild(twitterImage);
        createdElements.current.push(twitterImage);
      }
      twitterImage.setAttribute('content', image);
    }

    // Dynamic og:title / twitter:title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
      createdElements.current.push(ogTitle);
    }
    ogTitle.setAttribute('content', fullTitle);

    let twitterTitle = document.querySelector('meta[property="twitter:title"]');
    if (!twitterTitle) {
      twitterTitle = document.createElement('meta');
      twitterTitle.setAttribute('property', 'twitter:title');
      document.head.appendChild(twitterTitle);
      createdElements.current.push(twitterTitle);
    }
    twitterTitle.setAttribute('content', fullTitle);

    return () => {
      createdElements.current.forEach(el => el.remove());
    };
  }, [title, description, keywords, image]);

  return null;
}
