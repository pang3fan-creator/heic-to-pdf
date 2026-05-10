interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function FaqItem({ question, answer, isOpen, onToggle }: FaqItemProps) {
  return (
    <div className={`faq-item${isOpen ? " open" : ""}`}>
      <button className="faq-summary" onClick={onToggle} type="button" aria-expanded={isOpen}>
        {question}
        <span className="faq-icon">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && <div className="faq-answer">{answer}</div>}
    </div>
  );
}
