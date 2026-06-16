import SlDivider from '@shoelace-style/shoelace/dist/react/divider/index.js';

export function Divider() {
  if (process.env.NODE_ENV === 'test') {
    return <hr className="border-t border-border my-4" />;
  }

  return <SlDivider />;
}
