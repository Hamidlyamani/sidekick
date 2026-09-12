"""Vérification de bout en bout. `python smoke_test.py` — doit finir sur OK."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from app.crud import (
    add_message,
    chercher_ressources,
    get_or_create_profil,
    historique,
    maj_profil,
    programmer_rappel,
    rappels_a_envoyer,
    recommander,
    recos_du_profil,
    upsert_ressource,
)
from app.db import SessionLocal, init_db
from app.models import Role, Track, TypeRessource


async def main() -> None:
    await init_db()
    async with SessionLocal() as s:
        # 1. Profil : création puis récupération (pas de doublon)
        p, cree = await get_or_create_profil(s, "212600000000", "Test")
        assert cree is True
        p2, cree2 = await get_or_create_profil(s, "212600000000")
        assert cree2 is False and p2.id == p.id
        print("1. profil get_or_create ...................... OK")

        # 2. Mise à jour partielle + interets en vraie liste
        p = await maj_profil(
            s,
            p,
            ville="Casablanca",
            niveau="Bac+2",
            track="academique",
            interets=["développement web", "data"],
            champ_invente="doit être ignoré",
        )
        assert p.track is Track.academique
        assert p.interets == ["développement web", "data"]
        print("2. maj_profil + champ inconnu ignoré ........ OK")

        # 3. Idempotence webhook : le même wa_message_id ne passe qu'une fois
        m1 = await add_message(s, p.id, Role.user, "salut", wa_message_id="wamid.ABC")
        m2 = await add_message(s, p.id, Role.user, "salut", wa_message_id="wamid.ABC")
        assert m1 is not None and m2 is None
        await add_message(s, p.id, Role.assistant, "Bonjour, tu es en quelle année ?")
        hist = await historique(s, p.id)
        assert len(hist) == 2 and hist[0].role is Role.user
        print("3. idempotence wa_message_id ................ OK")

        # 4. Dédup ressource sur (type, url)
        r1 = await upsert_ressource(
            s,
            type=TypeRessource.filiere,
            titre="Test filière",
            url="https://exemple.ma/f1",
            ville="Casablanca",
        )
        r2 = await upsert_ressource(
            s,
            type=TypeRessource.filiere,
            titre="Test filière (titre mis à jour)",
            url="https://exemple.ma/f1",
        )
        assert r1.id == r2.id and r2.titre.endswith("(titre mis à jour)")
        print("4. dédup upsert_ressource ................... OK")

        # 5. Ressource expirée exclue par défaut
        await upsert_ressource(
            s,
            type=TypeRessource.offre,
            titre="Offre périmée",
            url="https://exemple.ma/offre-morte",
            date_expiration=datetime.now(timezone.utc) - timedelta(days=1),
        )
        vivantes = await chercher_ressources(s, type=TypeRessource.offre)
        assert all(o.titre != "Offre périmée" for o in vivantes)
        toutes = await chercher_ressources(
            s, type=TypeRessource.offre, inclure_expirees=True
        )
        assert any(o.titre == "Offre périmée" for o in toutes)
        print("5. filtre de fraîcheur ...................... OK")

        # 6. Recommandation : score + justification, et re-reco = mise à jour
        await recommander(s, p.id, r1.id, 0.91, "Correspond à ton intérêt pour le web.")
        await recommander(s, p.id, r1.id, 0.95, "Justification affinée.")
        recos = await recos_du_profil(s, p.id)
        assert len(recos) == 1 and recos[0].score == 0.95
        # La ressource est accessible hors session grâce à lazy="selectin"
        assert recos[0].ressource.titre.startswith("Test filière")
        assert recos[0].justification == "Justification affinée."
        print("6. recommandation + justification ........... OK")

        # 7. Données du seed bien présentes, avec leurs URLs sources
        filieres = await chercher_ressources(s, type=TypeRessource.filiere, limit=50)
        seed = [f for f in filieres if f.source == "seed"]
        assert len(seed) == 4 and all(f.url and f.url.startswith("http") for f in seed)
        print(f"7. seed : {len(seed)} filières sourcées ............. OK")

        # 8. Rappels : rien maintenant, un dû dans le passé
        await programmer_rappel(
            s, p.id, "Futur", datetime.now(timezone.utc) + timedelta(days=3)
        )
        await programmer_rappel(
            s, p.id, "Dû", datetime.now(timezone.utc) - timedelta(minutes=5)
        )
        dus = await rappels_a_envoyer(s)
        assert len(dus) == 1 and dus[0].libelle == "Dû"
        print("8. rappels à envoyer ........................ OK")

    print("\nTOUT OK")


if __name__ == "__main__":
    asyncio.run(main())
