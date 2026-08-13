import { useEffect, useRef } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  image?: string;
  canonical?: string;
  type?: string;
}

export default function SEO({ title, description, keywords, image, canonical, type = 'website' }: SEOProps) {
  const createdElements = useRef<Element[]>([]);

  useEffect(() => {
    createdElements.current = [];

    const fullTitle = title.includes('CIGHT') ? title : `${title} | CIGHT`;
    document.title = fullTitle;

    const currentUrl = window.location.href;
    const canonicalUrl = canonical || currentUrl;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        createdElements.current.push(el);
      }
      el.setAttribute('content', content);
    };

    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
      setMeta('property', 'twitter:description', description);
    }

    if (keywords) {
      setMeta('name', 'keywords', keywords);
    }

    if (image) {
      const fullImage = image.startsWith('http') ? image : `${window.location.origin}${image}`;
      setMeta('property', 'og:image', fullImage);
      setMeta('property', 'twitter:image', fullImage);
    }

    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:type', type);
    setMeta('property', 'twitter:title', fullTitle);

    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
      createdElements.current.push(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    return () => {
      createdElements.current.forEach(el => el.remove());
    };
  }, [title, description, keywords, image, canonical, type]);

  return null;
}
