from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import spacy

nlp = spacy.load("en_core_web_sm")
router = APIRouter()

class SentenceRequest(BaseModel):
    text: str

@router.post("/nlp/analyze")
def analyze(req: SentenceRequest):
    doc = nlp(req.text)

    # Sentence segmentation
    sentences = [sent.text.strip() for sent in doc.sents]

    # Tokenization with full analysis
    tokens = []
    for token in doc:
        tokens.append({
            "text": token.text,
            "lemma": token.lemma_,
            "pos": token.pos_,
            "tag": token.tag_,
            "dep": token.dep_,
            "is_stop": token.is_stop,
            "morph": str(token.morph)
        })

    # Named entities
    entities = [
        {"text": ent.text, "label": ent.label_}
        for ent in doc.ents
    ]

    return {
        "text": req.text,
        "sentences": sentences,
        "tokens": tokens,
        "entities": entities
    }

@router.post("/nlp/tokenize")
def tokenize(req: SentenceRequest):
    doc = nlp(req.text)
    return {
        "tokens": [token.text for token in doc],
        "count": len(doc)
    }

@router.post("/nlp/pos")
def pos_tag(req: SentenceRequest):
    doc = nlp(req.text)
    return {
        "pos_tags": [
            {"text": token.text, "pos": token.pos_, "tag": token.tag_}
            for token in doc
        ]
    }

@router.post("/nlp/sentences")
def segment(req: SentenceRequest):
    doc = nlp(req.text)
    return {
        "sentences": [
            {"text": sent.text.strip(), "start": sent.start, "end": sent.end}
            for sent in doc.sents
        ]
    }
