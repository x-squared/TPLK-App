export async function withPreservedMainContentScroll<T>(task: () => Promise<T>): Promise<T> {
  const scrollContainer = document.querySelector('.main-content') as HTMLElement | null;
  const scrollTopBefore = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
  try {
    return await task();
  } finally {
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollTopBefore;
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollTopBefore;
      });
    } else {
      window.scrollTo({ top: scrollTopBefore });
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollTopBefore });
      });
    }
  }
}
