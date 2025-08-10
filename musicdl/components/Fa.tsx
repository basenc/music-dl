import {
  icon,
  type IconLookup,
  type IconParams,
} from "npm:@fortawesome/fontawesome-svg-core";

type FaProps = Omit<IconParams, "icon"> & { icon: IconLookup; class?: string };

export default function Fa(props: FaProps) {
  const rendered = icon(props.icon, props);
  // icon() returns { html: [string] }
  return (
    <span class={props.class}>
      {rendered.html.map((html, i) => (
        <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
      ))}
    </span>
  );
}
