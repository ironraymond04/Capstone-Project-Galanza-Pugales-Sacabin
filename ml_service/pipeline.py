import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.multiclass import OneVsRestClassifier
from sklearn.pipeline import FeatureUnion, Pipeline


def clean(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"[^\w\s/]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def build_pipeline() -> Pipeline:
    features = FeatureUnion([
        # whole words + word pairs ("missing grade", "student id")
        ("word", TfidfVectorizer(preprocessor=clean, ngram_range=(1, 2),
                                 sublinear_tf=True, min_df=1)),
        # character n-grams survive typos and Cebuano/English mixing
        ("char", TfidfVectorizer(preprocessor=clean, analyzer="char_wb",
                                 ngram_range=(3, 5), sublinear_tf=True, min_df=1)),
    ])
    clf = OneVsRestClassifier(
        LogisticRegression(C=10, class_weight="balanced", solver="liblinear", max_iter=1000)
    )
    return Pipeline([("tfidf", features), ("ovr_lr", clf)])