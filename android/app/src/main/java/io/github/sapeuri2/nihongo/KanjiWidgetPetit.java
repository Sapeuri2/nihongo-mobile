package io.github.sapeuri2.nihongo;

/** Petit widget Kanji (2 × 2) : les mêmes 4 kanji que le grand, avec lecture et sens. */
public class KanjiWidgetPetit extends KanjiWidget {
    @Override
    protected int layout() {
        return R.layout.widget_kanji_petit;
    }
}
