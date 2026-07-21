"""Basic LangChain chatbot with OpenAI, prompt template, and conversation memory."""

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

load_dotenv()

# --- Config ---
MODEL_NAME = "gpt-4o-mini"
TEMPERATURE = 0.9
MAX_HISTORY_TURNS = 10  # keep last N question/answer pairs

# --- Prompt template ---
# Input variables: {question}, {chat_history}
SYSTEM_MESSAGE = "You are a helpful assistant. Answer clearly and concisely."
HUMAN_MESSAGE = "{question}"

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_MESSAGE),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", HUMAN_MESSAGE),
    ]
)

# --- Model ---
llm = ChatOpenAI(
    model=MODEL_NAME,
    temperature=TEMPERATURE,
)

# --- Chain: prompt -> model -> plain text ---
chain = prompt | llm | StrOutputParser()

# --- Memory: list of past Human / AI messages ---
chat_history: list = []


def ask(question: str) -> str:
    """Send a question with chat history, then save this turn to memory."""
    answer = chain.invoke(
        {
            "question": question,
            "chat_history": chat_history,
        }
    )

    # Remember this exchange for the next turn
    chat_history.append(HumanMessage(content=question))
    chat_history.append(AIMessage(content=answer))

    # Keep only the last N turns (each turn = 2 messages)
    max_messages = MAX_HISTORY_TURNS * 2
    if len(chat_history) > max_messages:
        del chat_history[:-max_messages]

    return answer


def main() -> None:
    print("LangChain Chatbot (with memory)")
    print(f"Model: {MODEL_NAME} | Temperature: {TEMPERATURE}")
    print(f"Memory: last {MAX_HISTORY_TURNS} turns")
    print("Type 'quit' or 'exit' to stop.\n")

    while True:
        question = input("You: ").strip()

        if not question:
            continue

        if question.lower() in {"quit", "exit", "q"}:
            print("Goodbye!")
            break

        answer = ask(question)
        print(f"Bot: {answer}\n")


if __name__ == "__main__":
    main()
