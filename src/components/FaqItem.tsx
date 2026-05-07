interface FaqItemProps {
  question: string;
  answer: string;
}

export default function FaqItem({ question, answer }: FaqItemProps) {
  return (
    <details className="faq-item">
      <summary className="faq-summary">{question}</summary>
      <div className="faq-answer">{answer}</div>
    </details>
  );
}
