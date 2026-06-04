type BlogConvertCtaProps = {
  heading: string;
  text: string;
  label: string;
  href: string;
};

export default function BlogConvertCta({ heading, text, label, href }: BlogConvertCtaProps) {
  return (
    <div className="blog-convert-cta">
      <h2>{heading}</h2>
      <p>{text}</p>
      <a className="blog-convert-cta-button" href={href}>
        {label}
      </a>
    </div>
  );
}
