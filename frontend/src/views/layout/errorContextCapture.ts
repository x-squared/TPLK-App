interface CapturedComponentDescriptor {
  selector: string;
  tag: string;
  id: string;
  class_name: string;
  text_sample: string;
}

interface CapturedComponentState {
  component: CapturedComponentDescriptor;
  captured_at: string;
}

let initialized = false;
let lastCapturedComponent: CapturedComponentState | null = null;

function buildSelector(element: HTMLElement): string {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const chain: string[] = [];
  let current: HTMLElement | null = element;
  let depth = 0;
  while (current && current.tagName.toLowerCase() !== 'body' && depth < 6) {
    const tag = current.tagName.toLowerCase();
    const parentElement: HTMLElement | null = current.parentElement;
    if (!parentElement) break;
    const siblings = Array.from(parentElement.children).filter((entry): entry is Element => (
      entry instanceof Element && entry.tagName === current!.tagName
    ));
    const index = siblings.indexOf(current) + 1;
    chain.unshift(`${tag}:nth-of-type(${Math.max(index, 1)})`);
    current = parentElement;
    depth += 1;
  }
  return chain.length > 0 ? chain.join(' > ') : element.tagName.toLowerCase();
}

function captureComponent(element: HTMLElement): void {
  lastCapturedComponent = {
    component: {
      selector: buildSelector(element),
      tag: element.tagName.toLowerCase(),
      id: element.id || '',
      class_name: element.className || '',
      text_sample: (element.textContent || '').trim().slice(0, 120),
    },
    captured_at: new Date().toISOString(),
  };
}

function maybeCaptureTarget(target: EventTarget | null): void {
  if (!(target instanceof HTMLElement)) return;
  if (!target.isConnected) return;
  captureComponent(target);
}

export function initializeErrorContextCapture(): void {
  if (initialized) return;
  initialized = true;
  document.addEventListener('pointerdown', (event) => {
    maybeCaptureTarget(event.target);
  }, true);
  document.addEventListener('focusin', (event) => {
    maybeCaptureTarget(event.target);
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    maybeCaptureTarget(event.target);
  }, true);
}

export function getLastCapturedComponent(): CapturedComponentState | null {
  return lastCapturedComponent;
}
