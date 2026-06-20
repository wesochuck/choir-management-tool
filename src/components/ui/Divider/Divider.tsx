import SlDivider from '@shoelace-style/shoelace/dist/react/divider/index.js';

export function Divider() {
  if (process.env.NODE_ENV === 'test') {
    return <hr className="border-border my-4 border-t" />;
  }

  return <SlDivider />;
}
