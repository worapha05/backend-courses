package com.bootcamp.beginner.collections;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

public final class CollectionsDemo {

    private static final Logger LOG = Logger.getLogger(CollectionsDemo.class.getName());

    public enum Role { ADMIN, EDITOR, VIEWER }

    public static void main(String[] args) {
        List<Integer> boxed = new ArrayList<>();
        boxed.add(1);
        boxed.add(2);

        List<Integer> snapshot = List.copyOf(boxed);
        LOG.info("immutable snapshot = " + snapshot);

        Set<String> tags = new LinkedHashSet<>();
        tags.add("java");
        tags.add("spring");
        tags.add("java");
        LOG.info("tags = " + tags);

        Map<String, StringBuilder> notes = new HashMap<>();
        StringBuilder shared = new StringBuilder("draft");
        notes.put("a", shared);
        notes.put("b", shared);
        shared.append("-edited");
        LOG.info("aliasing hazard: a=" + notes.get("a") + ", b=" + notes.get("b"));

        EnumMap<Role, Integer> quotas = new EnumMap<>(Role.class);
        quotas.put(Role.ADMIN, 1000);
        quotas.put(Role.EDITOR, 100);
        quotas.put(Role.VIEWER, 10);

        EnumSet<Role> writeRoles = EnumSet.of(Role.ADMIN, Role.EDITOR);
        LOG.info("write roles = " + writeRoles);
        LOG.info("editor quota = " + quotas.get(Role.EDITOR));

        Map<Role, Integer> publicQuotas = Map.copyOf(quotas);
        LOG.info("public quotas = " + publicQuotas);
    }
}
