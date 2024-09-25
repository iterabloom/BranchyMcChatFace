import random

class MockLLM:
    def __init__(self):
        self.responses = [
            "That's an interesting point. Can you elaborate further?",
            "I understand. Let me think about that for a moment.",
            "Your perspective is intriguing. Have you considered alternative viewpoints?",
            "That's a complex topic. There are several factors to consider.",
            "I see where you're coming from. Let's explore this idea further.",
            "Your question touches on some fundamental concepts. Let's break it down.",
            "That's a great observation. How do you think this relates to [topic]?",
            "I'm curious to hear more about your thoughts on this matter.",
            "Interesting point. In my analysis, there are pros and cons to consider.",
            "Your input is valuable. Let's dive deeper into this subject."
        ]

    def generate_response(self, messages):
        # Simulate some processing time
        import time
        time.sleep(random.uniform(0.5, 2.0))
        
        return random.choice(self.responses)

mock_llm = MockLLM()